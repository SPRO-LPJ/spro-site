// SPRO — Visionneuse des réalisations.
//
// Cliquer sur une carte de la section « Nos réalisations » ouvre les photos du
// chantier en plein écran, avec le nom du secteur et la liste des clients.
//
// Le manifeste des photos est produit par scripts/optimiser-galeries.mjs et
// chargé à la demande : tant que personne n'ouvre de galerie, pas un octet de
// photo ni de JSON n'est téléchargé.

const MANIFESTE = '/img/galeries/index.json';

let galeries = null;
let chargement = null;
let ouverte = null; // { photos, index }
let dernierFocus = null;

const chargerManifeste = () => {
  if (galeries) return Promise.resolve(galeries);
  chargement ??= fetch(MANIFESTE, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((j) => (galeries = j))
    .catch((err) => {
      console.error('[galerie] manifeste illisible :', err);
      return null;
    });
  return chargement;
};

/* ---------- Construction de la fenêtre ---------- */

const vue = document.createElement('div');
vue.className = 'gal';
vue.setAttribute('role', 'dialog');
vue.setAttribute('aria-modal', 'true');
vue.hidden = true;
vue.innerHTML = `
  <div class="gal-fond" data-fermer></div>
  <div class="gal-boite">
    <header class="gal-tete">
      <div>
        <p class="gal-secteur"></p>
        <p class="gal-refs"></p>
      </div>
      <button type="button" class="gal-fermer" data-fermer aria-label="Fermer la galerie">✕</button>
    </header>
    <div class="gal-scene">
      <button type="button" class="gal-nav gal-prec" aria-label="Photo précédente">‹</button>
      <figure class="gal-figure"><img alt="" /></figure>
      <button type="button" class="gal-nav gal-suiv" aria-label="Photo suivante">›</button>
    </div>
    <footer class="gal-pied">
      <span class="gal-compteur"></span>
      <div class="gal-vignettes"></div>
    </footer>
  </div>`;
document.body.appendChild(vue);

const $ = (s) => vue.querySelector(s);
const elImage = $('.gal-figure img');
const elSecteur = $('.gal-secteur');
const elRefs = $('.gal-refs');
const elCompteur = $('.gal-compteur');
const elVignettes = $('.gal-vignettes');

function afficher(i) {
  if (!ouverte) return;
  const n = ouverte.photos.length;
  ouverte.index = (i + n) % n;
  elImage.src = ouverte.photos[ouverte.index];
  elImage.alt = `${ouverte.secteur} — photo ${ouverte.index + 1} sur ${n}`;
  elCompteur.textContent = `${String(ouverte.index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
  elVignettes.querySelectorAll('button').forEach((b, j) => {
    b.classList.toggle('active', j === ouverte.index);
    if (j === ouverte.index) b.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
  // Précharge la suivante pour que la navigation ne clignote pas.
  if (n > 1) new Image().src = ouverte.photos[(ouverte.index + 1) % n];
}

function ouvrir(secteur, refs, photos, declencheur) {
  ouverte = { secteur, photos, index: 0 };
  dernierFocus = declencheur || null;
  elSecteur.textContent = secteur;
  elRefs.textContent = refs || '';
  elRefs.hidden = !refs;

  elVignettes.innerHTML = '';
  if (photos.length > 1) {
    photos.forEach((src, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Aller à la photo ${j + 1}`);
      b.innerHTML = `<img src="${src}" alt="" loading="lazy" />`;
      b.addEventListener('click', () => afficher(j));
      elVignettes.appendChild(b);
    });
  }
  vue.querySelectorAll('.gal-nav').forEach((b) => { b.hidden = photos.length < 2; });

  vue.hidden = false;
  document.documentElement.classList.add('gal-ouverte');
  if (window.lenis) window.lenis.stop();
  afficher(0);
  $('.gal-fermer').focus();
}

function fermer() {
  vue.hidden = true;
  ouverte = null;
  elImage.removeAttribute('src');
  document.documentElement.classList.remove('gal-ouverte');
  if (window.lenis) window.lenis.start();
  if (dernierFocus) dernierFocus.focus();
}

vue.addEventListener('click', (e) => { if (e.target.hasAttribute('data-fermer')) fermer(); });
$('.gal-prec').addEventListener('click', () => afficher(ouverte.index - 1));
$('.gal-suiv').addEventListener('click', () => afficher(ouverte.index + 1));
document.addEventListener('keydown', (e) => {
  if (vue.hidden) return;
  if (e.key === 'Escape') fermer();
  if (e.key === 'ArrowLeft') afficher(ouverte.index - 1);
  if (e.key === 'ArrowRight') afficher(ouverte.index + 1);
});

/* ---------- Branchement des cartes ---------- */

document.querySelectorAll('.real-card[data-galerie]').forEach((carte) => {
  carte.addEventListener('click', async (e) => {
    e.preventDefault();
    const g = await chargerManifeste();
    const photos = g && g[carte.dataset.galerie];
    if (!photos || !photos.length) {
      // Pas de photos pour ce secteur : on ne bloque pas le visiteur, on
      // l'emmène là où le lien pointait de toute façon. On relit le `href`
      // plutôt que de coder la cible en dur — les cartes pointent désormais
      // vers /realisations, et un lien réécrit ne doit pas laisser ce repli
      // derrière lui.
      // La 13e carte est un <div> sans href, et le manifeste peut échouer pour
      // toutes les cartes à la fois : on garde le défilement vers le contact
      // en dernier recours plutôt que de laisser un clic sans effet.
      const cible = carte.getAttribute('href');
      if (cible) window.location.href = cible;
      else document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    ouvrir(
      carte.querySelector('.rc-title')?.textContent.trim() || '',
      carte.querySelector('.rc-refs')?.textContent.trim() || '',
      photos,
      carte
    );
  });
});
