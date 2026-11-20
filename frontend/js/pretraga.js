const forma = document.getElementById('forma-filteri');
const rezultati = document.getElementById('rezultati');

const blokTocno = document.getElementById('godiste-tocno');
const blokRaspon = document.getElementById('godiste-raspon');

function promijeniTipGodista() {
    const tocno = forma.godiste_tip.value === 'tocno';
    blokTocno.hidden = !tocno;
    blokRaspon.hidden = tocno;
    blokTocno.querySelector('input').disabled = !tocno;
    blokRaspon.querySelectorAll('input').forEach(polje => {
        polje.disabled = tocno;
    });
}

document.querySelectorAll('input[name="godiste_tip"]').forEach(radio => {
    radio.addEventListener('change', promijeniTipGodista);
});
promijeniTipGodista();

async function ucitajOglase(parametri = '') {
    try {
        const odgovor = await fetch('/api/oglasi' + parametri);
        if (!odgovor.ok) throw new Error('Greška pri dohvatu');
        const oglasi = await odgovor.json();
        prikaziOglase(oglasi);
    } catch (err) {
        console.error(err);
        rezultati.innerHTML = '<p>Došlo je do greške pri učitavanju oglasa.</p>';
    }
}

function prikaziOglase(oglasi) {
    if (oglasi.length === 0) {
        rezultati.innerHTML = '<p>Nema oglasa koji odgovaraju pretrazi.</p>';
        return;
    }

    rezultati.innerHTML = '';
    oglasi.forEach(oglas => {
        const kartica = document.createElement('article');
        kartica.className = 'kartica';

        const slika = document.createElement('img');
        slika.src = 'img/placeholder.jpg';
        slika.alt = `${oglas.marka} ${oglas.model}`;

        const info = document.createElement('div');
        info.className = 'kartica-info';

        const naslov = document.createElement('h3');
        naslov.textContent = `${oglas.marka} ${oglas.model}`;

        const cijena = document.createElement('p');
        cijena.className = 'cijena';
        cijena.textContent = Number(oglas.cijena).toLocaleString('hr-HR') + ' €';

        const detalji = document.createElement('p');
        detalji.textContent =
            `${oglas.godina}. · ${Number(oglas.kilometraza).toLocaleString('hr-HR')} km · ${oglas.gorivo}`;

        const poveznica = document.createElement('a');
        poveznica.href = `detalji.html?id=${oglas.id}`;
        poveznica.className = 'gumb';
        poveznica.textContent = 'Detalji';

        info.append(naslov, cijena, detalji, poveznica);
        kartica.append(slika, info);
        rezultati.append(kartica);
    });
}

forma.addEventListener('submit', event => {
    event.preventDefault();
    const podaci = new FormData(forma);
    const parametri = new URLSearchParams();

    
    for (const [kljuc, vrijednost] of podaci) {
    if (kljuc === 'godiste_tip') continue;
    if (vrijednost.trim() !== '') {
        parametri.append(kljuc, vrijednost.trim());
    }
}

    const upit = parametri.toString();
    ucitajOglase(upit ? '?' + upit : '');
});

ucitajOglase();