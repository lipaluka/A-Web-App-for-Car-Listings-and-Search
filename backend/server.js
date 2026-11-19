require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/oglasi', async (req, res) => {
    try {
        const { marka, model, cijena_do, godina_od, gorivo } = req.query;
        const uvjeti = [];
        const vrijednosti = [];

        if (marka) {
            vrijednosti.push(`%${marka}%`);
            uvjeti.push(`marka ILIKE $${vrijednosti.length}`);
        }
        if (model) {
            vrijednosti.push(`%${model}%`);
            uvjeti.push(`model ILIKE $${vrijednosti.length}`);
        }
        if (cijena_do) {
            vrijednosti.push(cijena_do);
            uvjeti.push(`cijena <= $${vrijednosti.length}`);
        }
        if (godina_od) {
            vrijednosti.push(godina_od);
            uvjeti.push(`godina >= $${vrijednosti.length}`);
        }
        if (gorivo) {
            vrijednosti.push(gorivo);
            uvjeti.push(`gorivo = $${vrijednosti.length}`);
        }

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