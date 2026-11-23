require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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