// SPRO — Le navigateur restaure la position de scroll au rechargement. Sur un
// site dont l'ouverture est une vidéo pilotée au scroll, c'est intenable : on
// rechargeait depuis le milieu de la page, une vidéo pas encore décodée à cet
// endroit donnant un écran noir. On reprend donc la main : chaque chargement
// commence en haut, comme une vraie arrivée sur le site.
(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
})();
