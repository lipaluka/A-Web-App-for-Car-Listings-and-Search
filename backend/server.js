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


const GORIVA = ['Benzin', 'Dizel', 'Hibrid', 'Električni', 'Plin'];
const MJENJACI = ['Ručni', 'Automatski'];
const POGONI = ['Prednji', 'Stražnji', '4x4'];

function procitajOglas(body) {
    const tekst = v => (typeof v === 'string' ? v.trim() : '');
    const cijeli = v => {
        if (v === undefined || v === null || v === '') return null;
        const n = Number(v);
        return Number.isInteger(n) ? n : NaN;
    };

    const marka = tekst(body.marka);
    const model = tekst(body.model);
    const opis = tekst(body.opis) || null;
    const godina = cijeli(body.godina);
    const kilometraza = cijeli(body.kilometraza);
    const snaga_kw = cijeli(body.snaga_kw);
    const cijena = body.cijena === '' ? NaN : Number(body.cijena);
    const { gorivo, mjenjac, pogon } = body;

    if (!marka || marka.length > 50) return { greska: 'Unesi marku (najviše 50 znakova).' };
    if (!model || model.length > 50) return { greska: 'Unesi model (najviše 50 znakova).' };

    const najvecaGodina = new Date().getFullYear() + 1;
    if (godina === null || Number.isNaN(godina) || godina < 1950 || godina > najvecaGodina) {
        return { greska: `Godina mora biti između 1950 i ${najvecaGodina}.` };
    }
    if (!Number.isFinite(cijena) || cijena < 0 || cijena > 99999999) {
        return { greska: 'Unesi ispravnu cijenu.' };
    }
    if (Number.isNaN(kilometraza) || (kilometraza !== null && (kilometraza < 0 || kilometraza > 3000000))) {
        return { greska: 'Kilometraža nije ispravna.' };
    }
    if (Number.isNaN(snaga_kw) || (snaga_kw !== null && (snaga_kw < 0 || snaga_kw > 5000))) {
        return { greska: 'Snaga nije ispravna.' };
    }
    if (!GORIVA.includes(gorivo))   return { greska: 'Odaberi gorivo.' };
    if (!MJENJACI.includes(mjenjac)) return { greska: 'Odaberi mjenjač.' };
    if (!POGONI.includes(pogon))    return { greska: 'Odaberi pogon.' };
    if (opis && opis.length > 5000) return { greska: 'Opis je predug.' };

    return {
        podaci: { marka, model, godina, cijena, kilometraza, snaga_kw, gorivo, mjenjac, pogon, opis }
    };
}

app.post('/api/oglasi', trebaPrijavu, async (req, res) => {
    try {
        const { greska, podaci } = procitajOglas(req.body);
        if (greska) return res.status(400).json({ greska });

        const rezultat = await pool.query(
            `INSERT INTO oglas
                (korisnik_id, marka, model, godina, cijena, kilometraza, snaga_kw, gorivo, mjenjac, pogon, opis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [req.session.korisnik.id, podaci.marka, podaci.model, podaci.godina, podaci.cijena,
             podaci.kilometraza, podaci.snaga_kw, podaci.gorivo, podaci.mjenjac, podaci.pogon, podaci.opis]
        );
        res.status(201).json(rezultat.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

app.get('/api/moji-oglasi', trebaPrijavu, async (req, res) => {
    try {
        const rezultat = await pool.query(
            'SELECT * FROM oglas WHERE korisnik_id = $1 ORDER BY datum_objave DESC',
            [req.session.korisnik.id]
        );
        res.json(rezultat.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

app.get('/api/oglasi/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ greska: 'Neispravan id' });

        const rezultat = await pool.query('SELECT * FROM oglas WHERE id = $1', [id]);
        if (rezultat.rows.length === 0) return res.status(404).json({ greska: 'Oglas ne postoji' });
        res.json(rezultat.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

app.put('/api/oglasi/:id', trebaPrijavu, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ greska: 'Neispravan id' });

        const { greska, podaci } = procitajOglas(req.body);
        if (greska) return res.status(400).json({ greska });

        const rezultat = await pool.query(
            `UPDATE oglas SET
                marka = $1, model = $2, godina = $3, cijena = $4, kilometraza = $5,
                snaga_kw = $6, gorivo = $7, mjenjac = $8, pogon = $9, opis = $10
             WHERE id = $11 AND korisnik_id = $12
             RETURNING *`,
            [podaci.marka, podaci.model, podaci.godina, podaci.cijena, podaci.kilometraza,
             podaci.snaga_kw, podaci.gorivo, podaci.mjenjac, podaci.pogon, podaci.opis,
             id, req.session.korisnik.id]
        );

        if (rezultat.rows.length === 0) {
            return res.status(404).json({ greska: 'Oglas ne postoji ili nije tvoj.' });
        }
        res.json(rezultat.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ greska: 'Greška na serveru' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server radi na http://localhost:${PORT}`));