// SPRO — Filtre par environnement de la page Réalisations.
//
// Douze secteurs, quatre-vingt-quatre photos : sans tri, le visiteur qui vient
// pour un seul domaine doit tout parcourir. Le filtre n'ajoute pas de contenu,
// il en retire de la vue — donc rien ne change pour un moteur de recherche :
// au chargement tout est affiché, et les sections masquées restent dans le
// document.
//
// Deux détails qui ne sont pas cosmétiques :
//
// 1. L'alternance clair/sombre. Les douze sections alternent `.on-paper` et
//    `.on-ink`. Dès qu'on en masque, la suite se casse — deux blocs sombres
//    collés. On réattribue donc les deux classes selon le rang des sections
//    *visibles*, pas selon leur rang dans le document.
//
// 2. L'adresse. Le secteur actif est écrit dans le fragment (#magasins), ce
//    qui rend la vue partageable et permet d'ouvrir la page déjà filtrée.
//    `replaceState` plutôt que `pushState` : chaque clic de filtre n'a pas à
//    créer une entrée d'historique, le bouton Retour doit ramener à la page
//    précédente, pas au filtre précédent.

const barre = document.querySelector('.real-filtres');
const sections = Array.from(document.querySelectorAll('.real-secteur'));

if (barre && sections.length) {
  const boutons = Array.from(barre.querySelectorAll('.real-filtre'));

  // Rétablit l'alternance sur les seules sections visibles.
  const alterner = () => {
    let rang = 0;
    for (const section of sections) {
      if (section.hidden) continue;
      section.classList.toggle('on-paper', rang % 2 === 0);
      section.classList.toggle('on-ink', rang % 2 === 1);
      rang += 1;
    }
  };

  // Amène la barre de filtre en haut de l'écran, sous l'en-tête fixe.
  //
  // On se replace toujours, y compris au chargement, et c'est nécessaire : le
  // navigateur saute bien à l'ancre demandée, mais il calcule cette position
  // sur la page entière — puis le filtrage retire tout ce qui précède et la
  // position devient fausse. Sans ça on atterrissait au milieu des photos.
  //
  // On vise la barre plutôt que la section : le visiteur doit voir tout de
  // suite qu'un tri est actif, et comment en sortir. Sinon il croit que le
  // site ne montre que des hôtels.
  //
  // L'en-tête est en `position:fixed` : sa hauteur ne compte pas dans le
  // défilement, il faut la retrancher à la main sous peine de coiffer la barre.
  const placer = (geste) => {
    const entete = document.querySelector('.topbar');
    const marge = (entete ? entete.getBoundingClientRect().height : 0) + 16;
    const cible = barre.getBoundingClientRect().top + window.scrollY - marge;
    window.scrollTo({ top: Math.max(cible, 0), behavior: geste ? 'smooth' : 'auto' });
  };

  // `geste` distingue une action de l'utilisateur d'une application au
  // chargement : seule la première mérite un défilement animé.
  const appliquer = (cible, geste) => {
    for (const section of sections) {
      section.hidden = cible !== 'tous' && section.id !== cible;
    }
    alterner();

    for (const bouton of boutons) {
      const actif = bouton.dataset.cible === cible;
      bouton.classList.toggle('actif', actif);
      bouton.setAttribute('aria-pressed', String(actif));
    }

    const adresse = cible === 'tous' ? location.pathname : `${location.pathname}#${cible}`;
    history.replaceState(null, '', adresse);

    placer(geste);
  };

  for (const bouton of boutons) {
    bouton.addEventListener('click', () => appliquer(bouton.dataset.cible, true));
  }

  // Ouverture directe sur un secteur : /realisations#magasins
  //
  // Traité aussi sur `hashchange`, et pas seulement au chargement : le
  // fragment peut arriver après l'exécution du module — adresse modifiée à la
  // main, lien vers un autre secteur depuis la même page, ou navigation qui
  // pose l'URL de base avant le fragment. `appliquer` passe par
  // `replaceState`, qui ne déclenche pas `hashchange` : pas de boucle.
  const suivreAdresse = (geste) => {
    const demande = decodeURIComponent(location.hash.slice(1));
    if (demande && sections.some((s) => s.id === demande)) appliquer(demande, geste);
  };

  // Le filtrage est appliqué tout de suite, sans attendre : un `hashchange`
  // ou une image d'animation ne viendraient pas dans un onglet ouvert en
  // arrière-plan — clic du milieu, « ouvrir dans un nouvel onglet » — et le
  // visiteur y trouverait les douze secteurs au lieu du sien.
  suivreAdresse(false);

  // Le replacement, lui, doit repasser après le saut du navigateur vers
  // l'ancre, qui survient une fois la page chargée et écraserait notre
  // position. `load` plutôt qu'une image d'animation, pour la même raison
  // d'arrière-plan : il finit toujours par arriver.
  window.addEventListener('load', () => {
    if (location.hash) placer(false);
  });

  window.addEventListener('hashchange', () => suivreAdresse(true));
}
