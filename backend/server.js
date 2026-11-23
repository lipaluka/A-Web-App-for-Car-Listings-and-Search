require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'razvojni-secret-promijeni-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

function trebaPrijavu(req, res, next) {
    if (!req.session.korisnik) {
        return res.status(401).json({ greska: 'Potrebna je prijava' });
    }
    next();
}

function trebaAdmina(req, res, next) {
    if (!req.session.korisnik || req.session.korisnik.uloga !== 'admin') {
        return res.status(403).json({ greska: 'Nemaš ovlasti' });
    }
    next();
}

app.post('/api/registracija', async (req, res) => {
    try {
        const ime = (req.body.ime || '').trim();
        const prezime = (req.body.prezime || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const telefon = (req.body.telefon || '').trim() || null;
        const lozinka = req.body.lozinka || '';

        if (!ime || !prezime || !email.includes('@') || lozinka.length < 8) {
            return res.status(400).json({
                greska: 'Unesi ime, prezime, ispravan email i lozinku od najmanje 8 znakova.'
            });
        }
        if (telefon && telefon.length > 20) {
            return res.status(400).json({ greska: 'Telefon je predug.' });
        }

        const postoji = await pool.query('SELECT 1 FROM korisnik WHERE email = $1', [email]);
        if (postoji.rows.length > 0) {
            return res.status(409).json({ greska: 'Račun s tim emailom već postoji.' });
        }

        const hash = await bcrypt.hash(lozinka, 10);
        const rezultat = await pool.query(
            `INSERT INTO korisnik (ime, prezime, email, lozinka_hash, telefon)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, ime, prezime, uloga`,
            [ime, prezime, email, hash, telefon]
        );

        req.session.korisnik = rezultat.rows[0];
        res.status(201).json({ korisnik: rezultat.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

app.post('/api/prijava', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const lozinka = req.body.lozinka || '';

        const rezultat = await pool.query(
            'SELECT id, ime, prezime, uloga, lozinka_hash FROM korisnik WHERE email = $1',
            [email]
        );
        const redak = rezultat.rows[0];

        // Ista poruka za krivi email i krivu lozinku
        if (!redak || !(await bcrypt.compare(lozinka, redak.lozinka_hash))) {
            return res.status(401).json({ greska: 'Pogrešan email ili lozinka.' });
        }

        req.session.korisnik = {
            id: redak.id,
            ime: redak.ime,
            prezime: redak.prezime,
            uloga: redak.uloga
        };
        res.json({ korisnik: req.session.korisnik });
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

app.post('/api/odjava', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ ok: true });
    });
});

app.get('/api/ja', (req, res) => {
    res.json({ korisnik: req.session.korisnik || null });
});

app.get('/api/oglasi', async (req, res) => {
    try {
        const uvjeti = [];
        const vrijednosti = [];

        const dodaj = (uvjet, vrijednost) => {
            vrijednosti.push(vrijednost);
            uvjeti.push(uvjet.replace('?', '$' + vrijednosti.length));
        };

        const broj = v => {
            if (v === undefined || v === '') return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };

        const q = req.query;

        if (q.marka) dodaj('marka ILIKE ?', `%${q.marka}%`);
        if (q.model) dodaj('model ILIKE ?', `%${q.model}%`);
        if (q.gorivo)  dodaj('gorivo = ?',  q.gorivo);
        if (q.mjenjac) dodaj('mjenjac = ?', q.mjenjac);
        if (q.pogon)   dodaj('pogon = ?',   q.pogon);

        const rasponi = [
            ['cijena',      'cijena_od',  'cijena_do'],
            ['godina',      'godina_od',  'godina_do'],
            ['kilometraza', 'km_od',      'km_do'],
            ['snaga_kw',    'snaga_od',   'snaga_do'],
        ];
        for (const [stupac, odParam, doParam] of rasponi) {
            const od = broj(q[odParam]);
            const do_ = broj(q[doParam]);
            if (od !== null)  dodaj(`${stupac} >= ?`, od);
            if (do_ !== null) dodaj(`${stupac} <= ?`, do_);
        }

        const godina = broj(q.godina);
        if (godina !== null) dodaj('godina = ?', godina);

        const where = uvjeti.length ? 'WHERE ' + uvjeti.join(' AND ') : '';
        const rezultat = await pool.query(
            `SELECT * FROM oglas ${where} ORDER BY datum_objave DESC`,
            vrijednosti
        );
        res.json(rezultat.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server radi na http://localhost:${PORT}`));