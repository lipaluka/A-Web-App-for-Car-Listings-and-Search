function prikaziOglase(oglasi, kontejner) {
    if (oglasi.length === 0) {
        kontejner.textContent = 'Nema oglasa koji odgovaraju pretrazi.';
        return;
    }

    kontejner.innerHTML = '';
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
        kontejner.append(kartica);
    });
}