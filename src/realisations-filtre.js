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

  const appliquer = (cible, deplacer) => {
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

    // On ne remonte que sur une action de l'utilisateur : au chargement, le
    // navigateur a déjà placé la page sur l'ancre demandée.
    if (deplacer) barre.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const suivreAdresse = (deplacer) => {
    const demande = decodeURIComponent(location.hash.slice(1));
    if (demande && sections.some((s) => s.id === demande)) appliquer(demande, deplacer);
  };

  suivreAdresse(false);
  window.addEventListener('hashchange', () => suivreAdresse(true));
}
