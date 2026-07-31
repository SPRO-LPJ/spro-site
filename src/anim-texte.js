// SPRO — Animation de la section « L'entreprise en chiffres ». Ce bloc n'a
// aucune image : les chiffres eux-mêmes portent le mouvement, chacun montant
// depuis un masque pendant que son compteur s'incrémente.
//
// Sans JS les chiffres sont déjà lisibles et immobiles, et en
// `prefers-reduced-motion` on affiche l'état final sans aucun mouvement.
//
// Une révélation mot par mot des titres a existé ici jusqu'au 23/07/2026 : elle
// enfermait chaque mot dans un masque et le faisait monter au scroll. Retirée —
// son déclencheur ne partait pas, si bien que le titre de la Méthode et celui
// des Chiffres restaient purement et simplement invisibles. Ces titres portent
// maintenant `data-reveal`, le système éprouvé de site.js.

const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsapDispo = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

function demarrer() {
  const chiffres = Array.from(document.querySelectorAll('#chiffres .kn-item'));
  if (!chiffres.length) return;

  if (reduit || !gsapDispo) {
    chiffres.forEach((c) => c.classList.add('vu'));
    return;
  }

  chiffres.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 88%',
      once: true,
      // Le décalage se fait par colonne : la ligne se dévoile de gauche à droite.
      onEnter: () => setTimeout(() => item.classList.add('vu'), (i % 4) * 110),
    });
  });

  // Recalcul des repères une fois la page stabilisée. `load` ne suffit pas : les
  // images en `lazy` et la vidéo du hero continuent d'en changer la hauteur
  // après coup, et ScrollTrigger garderait des positions périmées.
  const recaler = () => ScrollTrigger.refresh();
  requestAnimationFrame(recaler);
  setTimeout(recaler, 1200);
}

// On attend le chargement complet, pas seulement le DOM : tant que la vidéo du
// hero et les polices ne sont pas là, la page ne fait pas sa hauteur définitive
// et ScrollTrigger calcule des positions fausses. Avec des déclencheurs en
// `once`, une position fausse au démarrage se paierait par une animation jouée
// à vide, avant même que la section soit à l'écran.
if (document.readyState === 'complete') {
  demarrer();
} else {
  window.addEventListener('load', demarrer);
}
