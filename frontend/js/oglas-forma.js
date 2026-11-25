const forma = document.getElementById('forma-oglas');
const poruka = document.getElementById('poruka-oglas');
const naslov = document.getElementById('naslov');
const gumbSpremi = document.getElementById('gumb-spremi');

const idOglasa = new URLSearchParams(window.location.search).get('id');

async function pokreni() {
    let korisnik = null;
    try {
        const odgovor = await fetch('/api/ja');
        korisnik = (await odgovor.json()).korisnik;
    } catch (err) {
        console.error(err);
    }
    if (!korisnik) {
        window.location.href = 'prijava.html';
        return;
    }

    if (!idOglasa) return;

    naslov.textContent = 'Uredi oglas';
    gumbSpremi.textContent = 'Spremi promjene';

    try {
        const odgovor = await fetch(`/api/oglasi/${encodeURIComponent(idOglasa)}`);
        if (!odgovor.ok) {
            poruka.textContent = 'Oglas ne postoji.';
            gumbSpremi.disabled = true;
            return;
        }
        const oglas = await odgovor.json();

        if (oglas.korisnik_id !== korisnik.id) {
            poruka.textContent = 'Ovo nije tvoj oglas.';
            gumbSpremi.disabled = true;
            return;
        }

        for (const polje of ['marka', 'model', 'godina', 'cijena', 'kilometraza',
                             'snaga_kw', 'gorivo', 'mjenjac', 'pogon', 'opis']) {
            forma.elements[polje].value = oglas[polje] ?? '';
        }
    } catch (err) {
        console.error(err);
        poruka.textContent = 'Greška pri učitavanju oglasa.';
    }
}

forma.addEventListener('submit', async event => {
    event.preventDefault();
    poruka.textContent = '';

    const podaci = Object.fromEntries(new FormData(forma));
    const url = idOglasa ? `/api/oglasi/${encodeURIComponent(idOglasa)}` : '/api/oglasi';

    try {
        const odgovor = await fetch(url, {
            method: idOglasa ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(podaci)
        });

        if (odgovor.status === 401) {
            window.location.href = 'prijava.html';
            return;
        }
        const rezultat = await odgovor.json();
        if (!odgovor.ok) {
            poruka.textContent = rezultat.greska || 'Došlo je do greške.';
            return;
        }
        window.location.href = 'moji-oglasi.html';
    } catch (err) {
        console.error(err);
        poruka.textContent = 'Greška u komunikaciji sa serverom.';
    }
});

pokreni();