// SPRO — Le navigateur restaure la position de scroll au rechargement. Sur un
// site dont l'ouverture est une vidéo pilotée au scroll, c'est intenable : on
// rechargeait depuis le milieu de la page, une vidéo pas encore décodée à cet
// endroit donnant un écran noir. On reprend donc la main : chaque chargement
// commence en haut, comme une vraie arrivée sur le site.
// Exception (2026-08-31) : les anciennes URL du site PHP redirigent vers des
// ancres (`/#boutique`, `/#domaines`…). Sans le test ci-dessous, le visiteur
// qui arrive de Google était renvoyé en haut de page par ce script pendant que
// le navigateur, lui, sautait à l'ancre — les deux se disputaient la position
// et le résultat était aléatoire : tantôt en haut, tantôt au milieu. On ne
// reprend donc la main que lorsqu'aucune ancre n'est demandée.
(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (window.location.hash) return;
  window.scrollTo(0, 0);
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
})();
