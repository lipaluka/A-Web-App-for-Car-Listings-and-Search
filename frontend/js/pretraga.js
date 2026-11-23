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
        prikaziOglase(oglasi, rezultati);
    } catch (err) {
        console.error(err);
        rezultati.innerHTML = '<p>Došlo je do greške pri učitavanju oglasa.</p>';
    }
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

document.querySelectorAll('.reset-polje').forEach(gumb => {
    gumb.addEventListener('click', () => {
        gumb.dataset.polja.split(',').forEach(ime => {
            forma.elements[ime].value = '';
        });
        forma.requestSubmit(); 
    });
});


forma.addEventListener('reset', () => {
    setTimeout(() => {
        promijeniTipGodista(); 
        ucitajOglase();       
    }, 0);
});

ucitajOglase();