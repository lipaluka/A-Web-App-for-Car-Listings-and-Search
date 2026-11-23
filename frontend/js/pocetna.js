const najnoviji = document.getElementById('najnoviji');

async function ucitajNajnovije() {
    try {
        const odgovor = await fetch('/api/oglasi');
        if (!odgovor.ok) throw new Error('Greška pri dohvatu');
        const oglasi = await odgovor.json();
        prikaziOglase(oglasi.slice(0, 5), najnoviji);
    } catch (err) {
        console.error(err);
        najnoviji.textContent = 'Oglasi se trenutno ne mogu učitati.';
    }
}

ucitajNajnovije();