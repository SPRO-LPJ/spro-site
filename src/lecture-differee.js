// SPRO — Lecture différée des vidéos situées loin sous la ligne de flottaison.
//
// Une <video autoplay> se télécharge dès l'ouverture de la page, même placée
// tout en bas : sur mobile, la vidéo du showroom (3,4 Mo) et celle du local de
// tri ECODDS (4,9 Mo) partaient ainsi avant même qu'on ait quitté le hero, en
// concurrence avec lui. Elles portent désormais `preload="none"` sans
// `autoplay` : seule l'affiche (poster) est chargée, puis la lecture démarre
// quand le bloc approche de l'écran, et s'arrête quand il en sort. Une fois à
// l'écran, le rendu est le même qu'avant : vidéo muette, en boucle.
//
// On observe le CONTENEUR de la vidéo, jamais un élément animé en clip-path :
// sous Chrome, un élément recadré à zéro n'est jamais signalé visible par
// IntersectionObserver.
//
// Le mouvement réduit n'est pas pris en compte ici, à dessein : ces vidéos
// étaient déjà lues dans ce cas-là (comme celle du hero), on garde ce
// comportement.

// Avance prise sur l'arrivée du bloc : de quoi charger les premières images
// avant qu'il n'apparaisse, sans rien télécharger pour un visiteur qui reste
// en haut de page.
const MARGE_APPROCHE = '400px 0px';

// Lance la lecture. `play()` peut être refusé (mode économie d'énergie sous
// iOS, par exemple) : l'affiche reste alors en place, comme avant ce
// changement où l'autoplay échouait de la même façon.
export function lire(video) {
  const promesse = video.play();
  if (promesse) promesse.catch(() => {});
}

// Appelle `rappel(true)` quand `conteneur` approche de l'écran, `rappel(false)`
// quand il s'en éloigne. Sans IntersectionObserver (navigateur très ancien),
// on se comporte comme avant : lecture immédiate.
export function surApproche(conteneur, rappel) {
  if (!('IntersectionObserver' in window)) {
    rappel(true);
    return;
  }
  new IntersectionObserver(
    ([entree]) => rappel(entree.isIntersecting),
    { rootMargin: MARGE_APPROCHE },
  ).observe(conteneur);
}

// Cas simple : une vidéo fixe dans un conteneur fixe.
export function lectureDifferee(video, conteneur = video.parentElement) {
  surApproche(conteneur, (proche) => {
    if (proche) lire(video);
    else video.pause();
  });
}
