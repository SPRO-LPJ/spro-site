// SPRO — Rappel de contact flottant. Reprend l'accroche du bloc de clôture
// « Un projet à nous confier ? » et la ramène sous les yeux pendant la lecture,
// le but de la page étant de générer des appels.
//
// Il ne s'affiche qu'une fois l'intro passée, disparaît dès que la section
// Contact arrive (le vrai formulaire y est, le rappel n'y serait que du bruit)
// et se ferme définitivement pour la visite si on le congédie.
(function(){
  const rappel = document.getElementById('rappel');
  if (!rappel) return;

  const CLE = 'spro-rappel-ferme';
  // Déclenché à l'expertise et non aux réalisations : proposer un devis a du
  // sens une fois le travail montré, pas à la première section venue.
  const declencheur = document.getElementById('expertise');
  const contact = document.getElementById('contact');
  if (!declencheur || !contact) return;

  let entreDansLeContenu = false, contactVisible = false;
  let ferme = false;
  try { ferme = sessionStorage.getItem(CLE) === '1'; } catch (e) { /* navigation privée */ }

  // Pas de repli automatique : le panneau reste ouvert, bouton "Parler de
  // votre projet" visible, tant que l'utilisateur ne le ferme pas lui-même
  // via la croix. Un repli minuté le faisait disparaître au bout de 9s sans
  // que ce soit toujours remarqué.
  const rafraichir = () => {
    const montrer = entreDansLeContenu && !contactVisible && !ferme;
    rappel.classList.toggle('visible', montrer);
  };

  // Le rappel n'a de sens qu'une fois le hero franchi : on attend que les
  // réalisations soient réellement à l'écran.
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) entreDansLeContenu = true;
    rafraichir();
  }, { threshold: 0.12 }).observe(declencheur);

  new IntersectionObserver(([e]) => {
    contactVisible = e.isIntersecting;
    rafraichir();
  }, { rootMargin: '0px 0px -20% 0px' }).observe(contact);

  rappel.querySelector('.rappel-fermer').addEventListener('click', () => {
    ferme = true;
    rafraichir();
    try { sessionStorage.setItem(CLE, '1'); } catch (e) { /* sans conséquence */ }
  });
})();
