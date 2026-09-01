// SPRO — Header : menu mobile et suivi de la section courante.
//
// Sous 960 px la navigation était simplement masquée, sans rien pour la
// remplacer : plus aucun accès aux sections depuis un téléphone. Le bouton
// ouvre désormais un vrai panneau plein écran.

const burger = document.getElementById('burger');
const menu = document.getElementById('menuMobile');

if (burger && menu) {
  const basculer = (ouvrir) => {
    burger.setAttribute('aria-expanded', String(ouvrir));
    burger.setAttribute('aria-label', ouvrir ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.hidden = !ouvrir;
    document.documentElement.classList.toggle('menu-ouvert', ouvrir);
    // Lenis continuerait à faire défiler la page derrière le panneau.
    if (window.lenis) ouvrir ? window.lenis.stop() : window.lenis.start();
  };

  burger.addEventListener('click', () => basculer(menu.hidden));

  // Un lien cliqué ferme le menu, sinon on atterrit sur la section derrière le panneau.
  menu.querySelectorAll('a[href^="#"]').forEach((lien) => {
    lien.addEventListener('click', () => {
      basculer(false);
      const cible = document.querySelector(lien.getAttribute('href'));
      if (cible && window.lenis) {
        // Le panneau vient de se fermer : on laisse Lenis reprendre la main.
        // Décalage aligné sur `scroll-margin-top` (styles.css), pour que le clic
        // de menu et l'arrivée directe par ancre posent la section au même
        // endroit. Le -70 précédent était plus court que le header lui-même
        // (93 px en desktop, 77 px en mobile) : le titre passait dessous.
        const decalage = window.matchMedia('(max-width:640px)').matches ? 92 : 108;
        requestAnimationFrame(() => window.lenis.scrollTo(cible, { offset: -decalage }));
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) basculer(false);
  });

  // Repasser en desktop avec le menu ouvert laissait la page bloquée au scroll.
  window.matchMedia('(min-width: 1431px)').addEventListener('change', (e) => {
    if (e.matches && !menu.hidden) basculer(false);
  });
}

/* ---------- Section courante soulignée dans la navigation ---------- */

const liens = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
const sections = liens
  .map((a) => ({ lien: a, cible: document.querySelector(a.getAttribute('href')) }))
  .filter((x) => x.cible);

if (sections.length) {
  const observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((e) => {
        if (!e.isIntersecting) return;
        const courant = sections.find((s) => s.cible === e.target);
        liens.forEach((l) => l.classList.toggle('actif', l === courant?.lien));
      });
    },
    // La bande de détection est au tiers haut de l'écran : la section est
    // considérée courante quand son sommet passe cette ligne, pas quand elle
    // effleure le bas de la fenêtre.
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
  );
  sections.forEach((s) => observateur.observe(s.cible));
}
