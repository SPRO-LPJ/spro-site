// SPRO — Annonce « ravalement printemps 2027 ».
//
// Fenêtre centrée qui s'ouvre une seule fois par chargement de page, quand le
// visiteur a dépassé la carte « Ravalements extérieurs » des réalisations.
// Rien n'est mémorisé : elle revient à chaque visite (choix du user).
// Fermeture : croix, clic sur le fond, touche Échap, ou bouton « Réserver »
// qui emmène au formulaire.

const fond = document.getElementById('campagneRavalement');
const carteRavalement = document.querySelector('#realisations [data-galerie="ravalement"]');
const contact = document.getElementById('contact');

// L'annonce part quand le bas de cette carte remonte au milieu de l'écran,
// et pas si le formulaire est déjà visible (arrivée directe par un
// lien #contact) : elle masquerait ce que le visiteur cherche.
const SEUIL_BAS_CARTE = 0.5;
const DUREE_FERMETURE_MS = 350;

if (fond && carteRavalement) {
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
    const basCarte = carteRavalement.getBoundingClientRect().bottom;
    const contactVisible = contact && contact.getBoundingClientRect().top < window.innerHeight;
    if (basCarte < window.innerHeight * SEUIL_BAS_CARTE && !contactVisible) {
      ouvrir();
      window.removeEventListener('scroll', verifier);
    }
  };

  croix.addEventListener('click', fermer);
  fond.addEventListener('click', (e) => { if (!fenetre.contains(e.target)) fermer(); });

  // Lenis ignore scrollTo tant qu'il est arrêté : on le relance d'abord, puis
  // on fait le défilement nous-mêmes (contact.js préremplit le message).
  if (reserver) reserver.addEventListener('click', (e) => {
    e.preventDefault();
    fermer();
    if (window.lenis) window.lenis.scrollTo('#contact', { offset: -72 });
    else contact.scrollIntoView({ behavior: 'smooth' });
  });

  window.addEventListener('scroll', verifier, { passive: true });
}
