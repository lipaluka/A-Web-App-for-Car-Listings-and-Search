const IZBORNIK_KORISNIK = [
    { tekst: 'Dodaj oglas', href: 'dodaj-oglas.html' },
    { tekst: 'Moji oglasi', href: 'moji-oglasi.html' },
];

const IZBORNIK_ADMIN = [
    { tekst: 'Brisanje oglasa', href: 'admin-oglasi.html' },
    { tekst: 'Arhiva oglasa', href: 'admin-arhiva.html' },
    { tekst: 'Pregled korisnika', href: 'admin-korisnici.html' },
];

function napraviLink(tekst, href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = tekst;
    return a;
}

async function ucitajKorisnika() {
    const mjesto = document.getElementById('korisnicki-izbornik');
    if (!mjesto) return;

    let korisnik = null;
    try {
        const odgovor = await fetch('/api/ja');
        if (odgovor.ok) korisnik = (await odgovor.json()).korisnik;
    } catch (err) {
        console.error(err);
    }

    mjesto.textContent = '';

    if (!korisnik) {
        mjesto.append(napraviLink('Prijava / Registracija', 'prijava.html'));
        return;
    }

    const stavke = korisnik.uloga === 'admin' ? IZBORNIK_ADMIN : IZBORNIK_KORISNIK;
    const naslov = korisnik.uloga === 'admin'
        ? `${korisnik.ime} (admin) ▾`
        : `${korisnik.ime} ▾`;

    const glavni = napraviLink(naslov, '#');
    glavni.addEventListener('click', e => e.preventDefault());

    const lista = document.createElement('ul');
    lista.className = 'padajuci';

    stavke.forEach(stavka => {
        const li = document.createElement('li');
        li.append(napraviLink(stavka.tekst, stavka.href));
        lista.append(li);
    });

    const odjava = napraviLink('Odjava', '#');
    odjava.addEventListener('click', async e => {
        e.preventDefault();
        await fetch('/api/odjava', { method: 'POST' });
        window.location.href = 'index.html';
    });
    const liOdjava = document.createElement('li');
    liOdjava.append(odjava);
    lista.append(liOdjava);

    mjesto.append(glavni, lista);
}

ucitajKorisnika();