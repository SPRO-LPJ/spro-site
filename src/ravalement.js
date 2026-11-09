// Comportements de la page ravalement : la video produit, puis la carte
// interactive de la zone.
//
// Le carrousel avant / pendant / apres vivait ici : le bloc qui le portait a
// ete retire de la page le 06/11, a la demande du user.
const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Vidéo produit : elle part toute seule, sans le son (seule lecture
// automatique que les navigateurs acceptent), quand elle est à moitié à
// l'écran, et se met en pause quand on la quitte. Dès que le visiteur se sert
// du lecteur (lecture, pause, son), c'est lui qui décide : on ne la pilote plus.
for (const video of document.querySelectorAll('video[data-auto-visible]')) {
  if (mouvementReduit) continue;
  let pilotee = true;
  let changementAuto = false;
  const piloter = (action) => {
    changementAuto = true;
    Promise.resolve(action()).catch(() => {}).finally(() => { changementAuto = false; });
  };
  ['play', 'pause', 'volumechange', 'seeking'].forEach((type) =>
    video.addEventListener(type, () => { if (!changementAuto) pilotee = false; }));
  new IntersectionObserver(([entree]) => {
    if (!pilotee) return;
    if (entree.isIntersecting) piloter(() => video.play());
    else if (!video.paused) piloter(() => video.pause());
  }, { threshold: 0.5 }).observe(video);
}


// Carte interactive de la zone. Toucher (ou survoler, ou Entrée au clavier)
// une commune ouvre une bulle : sa distance de Vannes, les chantiers SPRO qui
// s'y trouvent (photo, client, travaux — données dans #rvChantiers) et un lien
// qui descend au formulaire en y inscrivant la commune. Les secteurs sous la carte
// allument leurs communes et éteignent les autres.
const carte = document.querySelector('[data-carte]');
// La carte n'a plus de points cliquables (demande du user : « laisse juste
// la zone ») : sans bulle, rien à brancher.
if (carte && carte.querySelector('.rv-bulle')) {
  const cadre = carte.querySelector('.rv-carte-cadre');
  const bulle = carte.querySelector('.rv-bulle');
  const lieux = Array.from(carte.querySelectorAll('.rv-lieu, .rv-spro'));
  const chantiers = JSON.parse(document.getElementById('rvChantiers')?.textContent || '{}');
  const listeChantiers = bulle.querySelector('.rv-bulle-chantiers');
  const secteurs = Array.from(carte.querySelectorAll('.rv-secteurs button'));
  let lieuActif = null;

  const montrer = (lieu) => {
    lieuActif = lieu;
    lieux.forEach((l) => l.classList.toggle('actif', l === lieu));
    bulle.querySelector('.rv-bulle-nom').textContent = lieu.dataset.nom;
    const liste = chantiers[lieu.dataset.chantiers] || [];
    const km = Number(lieu.dataset.km);
    bulle.querySelector('.rv-bulle-km').textContent =
      (km ? `à ${km} km de Vannes` : 'Siège de SPRO') +
      (liste.length ? ` · ${liste.length} chantier${liste.length > 1 ? 's' : ''} SPRO` : '');
    listeChantiers.replaceChildren(...liste.map(({ client, travaux, photo }) => {
      const li = document.createElement('li');
      if (photo) {
        const img = document.createElement('img');
        img.src = photo;
        img.alt = '';
        img.loading = 'lazy';
        li.append(img);
      } else {
        li.classList.add('sans-photo');
      }
      const texte = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = client;
      texte.append(b, document.createTextNode(travaux));
      li.append(texte);
      return li;
    }));
    listeChantiers.hidden = liste.length === 0;
    bulle.classList.toggle('large', liste.length > 0);
    bulle.querySelector('.rv-bulle-lien').textContent = `Demander un devis à ${lieu.dataset.nom} →`;
    bulle.hidden = false;
    // Position du point dans le cadre (le SVG est en « slice » : on mesure le
    // point à l'écran plutôt que de recalculer l'échelle).
    const point = lieu.querySelector('circle:not(.rv-lieu-zone):not(.rv-spro-onde)').getBoundingClientRect();
    const boite = cadre.getBoundingClientRect();
    const x = point.left + point.width / 2 - boite.left;
    const y = point.top - boite.top;
    const demiLargeur = bulle.offsetWidth / 2;
    bulle.style.left = `${Math.min(boite.width - demiLargeur - 8, Math.max(demiLargeur + 8, x))}px`;
    // La bulle s'ouvre dessous quand elle n'a pas la place au-dessus.
    const dessous = y < bulle.offsetHeight + 20;
    bulle.classList.toggle('dessous', dessous);
    bulle.style.top = `${dessous ? y + point.height : y}px`;
  };
  const cacher = () => {
    lieuActif = null;
    bulle.hidden = true;
    lieux.forEach((l) => l.classList.remove('actif'));
    // Un point qui garde le focus resterait en surbrillance (Safari).
    if (lieux.includes(document.activeElement)) document.activeElement.blur();
  };

  // À la souris, la bulle suit le survol : elle se ferme quand le curseur
  // quitte le point, avec un court délai pour pouvoir glisser jusqu'à elle et
  // cliquer sur son lien. Au doigt ou au clavier, elle reste ouverte.
  let minuterieFermeture = 0;
  const fermerBientot = () => {
    clearTimeout(minuterieFermeture);
    minuterieFermeture = setTimeout(cacher, 220);
  };
  const garderOuverte = () => clearTimeout(minuterieFermeture);
  const souris = (e) => e.pointerType === 'mouse';

  // Safari ne signale pas fiablement les sorties de souris (ni d'un point
  // SVG, ni de la fenêtre). On ne s'y fie donc pas : à chaque mouvement de
  // souris, où qu'il soit dans la page, la bulle reste ouverte seulement si
  // le curseur est sur un point ou sur la bulle. « mousemove » plutôt que
  // « pointermove » : c'est l'événement que tous les navigateurs envoient.
  let dernierToucher = 0;
  document.addEventListener('touchstart', () => { dernierToucher = Date.now(); }, { passive: true });
  document.addEventListener('mousemove', (e) => {
    // Un toucher sur écran tactile émet aussi un mousemove : on l'ignore.
    if (!lieuActif || Date.now() - dernierToucher < 800) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t && t.closest('.rv-lieu, .rv-spro, .rv-bulle')) garderOuverte();
    else fermerBientot();
  });
  // Souris sortie de la fenêtre, ou onglet / application quittés.
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && lieuActif) fermerBientot(); });
  window.addEventListener('blur', () => { if (lieuActif) cacher(); });

  lieux.forEach((lieu) => {
    // Au clic souris, pas de focus : il laisserait le point allumé.
    lieu.addEventListener('mousedown', (e) => e.preventDefault());
    lieu.addEventListener('click', (e) => { e.stopPropagation(); garderOuverte(); montrer(lieu); });
    lieu.addEventListener('mouseenter', () => {
      if (Date.now() - dernierToucher < 800) return;
      garderOuverte();
      if (lieuActif !== lieu) montrer(lieu);
    });
    lieu.addEventListener('focus', () => montrer(lieu));
    lieu.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); montrer(lieu); }
    });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cacher(); });

  // Le lien de la bulle inscrit la commune dans le formulaire.
  bulle.querySelector('.rv-bulle-lien').addEventListener('click', () => {
    const champ = document.getElementById('cf-commune');
    if (champ && lieuActif) champ.value = lieuActif.dataset.nom;
  });

  const toutRallumer = () => {
    delete carte.dataset.secteur;
    secteurs.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    lieux.forEach((l) => l.classList.remove('eteint'));
  };
  // Quand la souris sort du carré de la carte, tout revient à zéro :
  // secteur désélectionné, bulle fermée.
  cadre.addEventListener('pointerleave', (e) => {
    if (!souris(e)) return;
    clearTimeout(minuterieFermeture);
    toutRallumer();
    cacher();
  });

  // Un clic ailleurs que sur un point, la bulle ou un secteur — dans la carte
  // comme dans le reste de la page — efface tout : bulle et secteur.
  document.addEventListener('click', (e) => {
    if (e.target.closest('.rv-lieu, .rv-spro, .rv-bulle, .rv-secteurs button')) return;
    toutRallumer();
    cacher();
  });

  secteurs.forEach((bouton) => {
    const allumer = () => {
      cacher();
      carte.dataset.secteur = bouton.dataset.secteur;
      secteurs.forEach((b) => b.setAttribute('aria-pressed', String(b === bouton)));
      lieux.forEach((l) => l.classList.toggle('eteint', l.dataset.secteur !== bouton.dataset.secteur));
    };
    bouton.setAttribute('aria-pressed', 'false');
    bouton.addEventListener('click', () => {
      if (bouton.getAttribute('aria-pressed') === 'true') {
        toutRallumer();
      } else {
        allumer();
      }
    });
  });
}
