// Carrousel avant / pendant / après de la page ravalement.
//
// Le défilement lui-même est natif (scroll-snap) : sans ce script, on fait
// déjà glisser les photos au doigt ou au pavé. On ajoute ici les flèches,
// les points, les touches du clavier, et le défilement automatique demandé
// par le user : une photo toutes les DELAI_AUTO ms, en boucle.
//
// L'automatique s'arrête pour de bon dès que le visiteur touche au carrousel
// (il a pris la main), se suspend au survol, hors de l'écran ou onglet
// masqué, et n'existe pas en prefers-reduced-motion.
const DELAI_AUTO = 4000;
const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
for (const carrousel of document.querySelectorAll('[data-carrousel]')) {
  const piste = carrousel.querySelector('.rv-piste');
  const vues = Array.from(piste.children);
  const commandes = carrousel.querySelector('.rv-commandes');
  const [precedent, suivant] = commandes.querySelectorAll('.rv-fleche');
  const points = commandes.querySelector('.rv-points');

  const boutons = vues.map((vue, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `Photo ${i + 1} sur ${vues.length}`);
    b.addEventListener('click', () => aller(i));
    points.append(b);
    return b;
  });

  const indexCourant = () => Math.round(piste.scrollLeft / piste.clientWidth);

  function aller(i) {
    const cible = Math.max(0, Math.min(vues.length - 1, i));
    piste.scrollTo({ left: vues[cible].offsetLeft - piste.offsetLeft });
  }

  function majEtat() {
    const i = indexCourant();
    boutons.forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    precedent.disabled = i === 0;
    suivant.disabled = i === vues.length - 1;
  }

  precedent.addEventListener('click', () => aller(indexCourant() - 1));
  suivant.addEventListener('click', () => aller(indexCourant() + 1));
  piste.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); aller(indexCourant() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); aller(indexCourant() - 1); }
  });

  let attente = 0;
  piste.addEventListener('scroll', () => {
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(majEtat);
  }, { passive: true });

  commandes.hidden = false;
  majEtat();

  if (mouvementReduit) continue;

  let arrete = false;
  let survol = false;
  let visible = false;
  let minuteur = 0;

  const peutDefiler = () => !arrete && !survol && visible && !document.hidden;
  const relancer = () => {
    clearTimeout(minuteur);
    if (peutDefiler()) minuteur = setTimeout(avancer, DELAI_AUTO);
  };
  function avancer() {
    const i = indexCourant();
    aller(i === vues.length - 1 ? 0 : i + 1);
    relancer();
  }
  const prendreLaMain = () => { arrete = true; clearTimeout(minuteur); };

  // Un geste du visiteur (doigt, clic, flèche, clavier) coupe l'automatique.
  ['pointerdown', 'wheel', 'keydown'].forEach((type) =>
    carrousel.addEventListener(type, prendreLaMain, { passive: true }));
  carrousel.addEventListener('mouseenter', () => { survol = true; clearTimeout(minuteur); });
  carrousel.addEventListener('mouseleave', () => { survol = false; relancer(); });
  document.addEventListener('visibilitychange', relancer);
  new IntersectionObserver(([entree]) => {
    visible = entree.isIntersecting;
    relancer();
  }, { threshold: 0.5 }).observe(carrousel);
}

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
