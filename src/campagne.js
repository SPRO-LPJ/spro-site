// SPRO — Annonce « ravalement printemps 2027 ».
//
// Fenêtre centrée qui s'ouvre une seule fois par chargement de page, quand le
// visiteur a dépassé l'élément désigné par data-apres sur #campagneRavalement
// (accueil : la carte « Ravalements extérieurs » ; page ravalement : la
// section des prestations).
// Rien n'est mémorisé : elle revient à chaque visite (choix du user).
// Fermeture : croix, clic sur le fond, touche Échap, ou bouton « Réserver »
// qui emmène au formulaire.

const fond = document.getElementById('campagneRavalement');
const repere = fond && document.querySelector(fond.dataset.apres);
const contact = document.getElementById('contact');
const appelFinal = fond && fond.dataset.sauf && document.querySelector(fond.dataset.sauf);

// L'annonce part quand le bas du repère remonte au milieu de l'écran, et pas
// si l'appel à l'action est déjà visible (arrivée directe par un lien
// #contact) : elle masquerait ce que le visiteur cherche.
const SEUIL_BAS_REPERE = 0.5;
// Arrivé par le bouton de l'annonce d'une autre page (?campagne=…) : il l'a
// déjà vue, on ne la lui remontre pas par-dessus le formulaire.
const venuParAnnonce = new URLSearchParams(window.location.search).has('campagne');
const DUREE_FERMETURE_MS = 350;

if (fond && repere && !venuParAnnonce) {
  const fenetre = fond.querySelector('[role="dialog"]');
  const croix = fond.querySelector('.campagne-fermer');
  const reserver = fond.querySelector('a[href="#contact"]');
  let dejaOuverte = false;
  let focusAvant = null;

  const surEchap = (e) => { if (e.key === 'Escape') fermer(); };

  const ouvrir = () => {
    dejaOuverte = true;
    focusAvant = document.activeElement;
    fond.hidden = false;
    if (window.lenis) window.lenis.stop();
    requestAnimationFrame(() => fond.classList.add('visible'));
    croix.focus({ preventScroll: true });
    document.addEventListener('keydown', surEchap);
  };

  function fermer() {
    if (fond.hidden) return;
    fond.classList.remove('visible');
    document.removeEventListener('keydown', surEchap);
    if (window.lenis) window.lenis.start();
    setTimeout(() => { fond.hidden = true; }, DUREE_FERMETURE_MS);
    if (focusAvant && focusAvant.focus) focusAvant.focus({ preventScroll: true });
  }

  const verifier = () => {
    if (dejaOuverte) return;
    const basRepere = repere.getBoundingClientRect().bottom;
    const appelVisible = appelFinal && appelFinal.getBoundingClientRect().top < window.innerHeight;
    if (basRepere < window.innerHeight * SEUIL_BAS_REPERE && !appelVisible) {
      ouvrir();
      window.removeEventListener('scroll', verifier);
    }
  };

  croix.addEventListener('click', fermer);
  fond.addEventListener('click', (e) => { if (!fenetre.contains(e.target)) fermer(); });

  // Sur l'accueil, le formulaire est sur la page. Lenis ignore scrollTo tant
  // qu'il est arrêté : on le relance d'abord, puis on fait le défilement
  // nous-mêmes (contact.js préremplit le message). Ailleurs, le bouton est un
  // lien ordinaire vers /?campagne=…#contact.
  if (reserver && contact) reserver.addEventListener('click', (e) => {
    e.preventDefault();
    fermer();
    if (window.lenis) window.lenis.scrollTo('#contact', { offset: -72 });
    else contact.scrollIntoView({ behavior: 'smooth' });
  });

  window.addEventListener('scroll', verifier, { passive: true });
}
