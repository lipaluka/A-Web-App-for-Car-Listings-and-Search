const kontejner = document.getElementById('moji');

async function ucitajMojeOglase() {
    try {
        const odgovor = await fetch('/api/moji-oglasi');
        if (odgovor.status === 401) {
            window.location.href = 'prijava.html';
            return;
        }
        if (!odgovor.ok) throw new Error('Greška pri dohvatu');

        const oglasi = await odgovor.json();
        if (oglasi.length === 0) {
            kontejner.textContent = 'Još nemaš nijedan oglas.';
            return;
        }

        prikaziOglase(oglasi, kontejner, oglas => {
            const uredi = document.createElement('a');
            uredi.href = `dodaj-oglas.html?id=${oglas.id}`;
            uredi.className = 'gumb';
            uredi.textContent = 'Uredi';
            return uredi;
        });
    } catch (err) {
        console.error(err);
        kontejner.textContent = 'Došlo je do greške pri učitavanju oglasa.';
    }
}

ucitajMojeOglase();