async function posalji(url, forma, poruka) {
    poruka.textContent = '';
    const podaci = Object.fromEntries(new FormData(forma));

    try {
        const odgovor = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(podaci)
        });
        const rezultat = await odgovor.json();

        if (!odgovor.ok) {
            poruka.textContent = rezultat.greska || 'Došlo je do greške.';
            return;
        }
        window.location.href = 'index.html';
    } catch (err) {
        console.error(err);
        poruka.textContent = 'Greška u komunikaciji sa serverom.';
    }
}

document.getElementById('forma-prijava').addEventListener('submit', event => {
    event.preventDefault();
    posalji('/api/prijava', event.target, document.getElementById('poruka-prijava'));
});

document.getElementById('forma-registracija').addEventListener('submit', event => {
    event.preventDefault();
    posalji('/api/registracija', event.target, document.getElementById('poruka-registracija'));
});