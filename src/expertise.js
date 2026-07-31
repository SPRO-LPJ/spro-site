// SPRO — Section « Notre expertise » : scène épinglée.
//
// Les quatre volets se superposent dans un cadre fixé à l'écran et se relaient
// au fil du scroll. Chaque passage est une transition continue, pilotée par la
// position de la molette (`scrub`) et non par un basculement sec :
//
//   · le texte sortant s'efface en montant et en rapetissant légèrement ;
//   · sa photo se referme par le bas (`clip-path`) ;
//   · la photo suivante s'ouvre dans la foulée, de l'autre côté de l'écran ;
//   · son texte arrive par le bas, en fondu.
//
// Un temps de pause encadre chaque volet, pour qu'on ait le temps de le lire
// avant que le suivant ne s'annonce.
//
// Sous 1025 px, rien de tout cela : la section reprend son empilement vertical.
// Épingler une section sur un téléphone enferme le visiteur dans un écran dont
// il ne sait plus comment sortir.

const scene = document.getElementById('expScene');
const volets = Array.from(document.querySelectorAll('#expertise .exp-item'));
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const grandEcran = () => window.matchMedia('(min-width: 1025px)').matches;

if (scene && volets.length) {
  const media = (v) => v.querySelector('.exp-media');
  const corps = (v) => v.querySelector('.exp-body');

  // Repère de progression, construit ici pour ne pas alourdir le HTML.
  const jalons = document.createElement('div');
  jalons.className = 'exp-jalons';
  jalons.setAttribute('aria-hidden', 'true');
  volets.forEach(() => jalons.appendChild(document.createElement('span')));
  scene.querySelector('.exp-sticky')?.appendChild(jalons);
  const reperes = Array.from(jalons.children);

  const FERME = 'inset(0% 0% 100% 0%)'; // photo repliée vers le haut
  const OUVERT = 'inset(0% 0% 0% 0%)';

  let piste = null;

  const empiler = () => {
    // Repli : tout est visible, dans le flux normal.
    volets.forEach((v) => {
      v.classList.add('actif');
      gsap?.set?.([media(v), corps(v)], { clearProps: 'all' });
      media(v).style.clipPath = '';
      corps(v).style.opacity = '';
      corps(v).style.transform = '';
    });
    reperes.forEach((r, j) => r.classList.toggle('actif', j === 0));
    scene.style.height = '';
  };

  const construire = () => {
    const gsapDispo = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    if (piste) { piste.scrollTrigger?.kill(); piste.kill(); piste = null; }

    if (!grandEcran() || reduit || !gsapDispo) { empiler(); return; }

    // La scène faisait 6,1 hauteurs d'écran pour quatre volets — près de 1 370 px
    // par volet, soit trois coups de molette : on se sentait bloqué dedans. Elle
    // vaut maintenant un écran fixe plus trois quarts par passage, ce qui met un
    // volet à un geste et demi. Un demi (0,55) avait été essayé : un seul geste
    // suffisait, mais le user l'a trouvé trop rapide pour lire.
    const transitions = volets.length - 1;
    scene.style.height = `${(1 + transitions * 0.75) * 100}vh`;

    // État de départ : seul le premier volet est monté.
    volets.forEach((v, i) => {
      v.classList.toggle('actif', i === 0);
      gsap.set(media(v), { clipPath: i === 0 ? OUVERT : FERME });
      gsap.set(corps(v), { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 60, scale: i === 0 ? 1 : 0.94 });
    });
    reperes.forEach((r, j) => r.classList.toggle('actif', j === 0));

    piste = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: scene,
        start: 'top top',
        end: 'bottom bottom',
        // Le rattrapage passe de 1 s à 0,4 : il amortit toujours la molette
        // « crantée » de Windows, sans donner l'impression que l'image traîne
        // derrière le geste maintenant que la scène est courte.
        scrub: 0.4,
        onUpdate: (self) => {
          const i = Math.min(volets.length - 1, Math.round(self.progress * (volets.length - 1)));
          reperes.forEach((r, j) => r.classList.toggle('actif', j === i));
        },
      },
    });

    // Les durées ci-dessous sont des proportions, pas des secondes : la timeline
    // entière est étalée sur la hauteur de la scène. Un passage vaut 1,1 unité,
    // dont 0,3 de pause — soit un peu plus du quart du parcours pendant lequel le
    // volet reste immobile et lisible.
    piste.to({}, { duration: 0.3 }); // on laisse lire le premier volet

    for (let i = 1; i < volets.length; i++) {
      const sortant = volets[i - 1];
      const entrant = volets[i];
      const t = `passage${i}`;

      piste.addLabel(t);
      // Le sortant s'efface en montant, sa photo se referme par le bas.
      piste.to(corps(sortant), { opacity: 0, y: -50, scale: 0.94, duration: 0.35 }, t);
      piste.to(media(sortant), { clipPath: FERME, duration: 0.45 }, t);
      // Le suivant est monté juste avant d'apparaître, pour ne jamais avoir
      // deux textes lisibles en même temps.
      piste.call(() => {
        volets.forEach((v, j) => v.classList.toggle('actif', j === i));
      }, null, t + '+=0.2');
      piste.fromTo(media(entrant), { clipPath: FERME }, { clipPath: OUVERT, duration: 0.5 }, t + '+=0.25');
      piste.fromTo(
        corps(entrant),
        { opacity: 0, y: 60, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45 },
        t + '+=0.35'
      );
      piste.to({}, { duration: 0.3 }); // pause de lecture
    }
  };

  if (document.readyState === 'complete') construire();
  else window.addEventListener('load', construire);

  window.matchMedia('(min-width: 1025px)').addEventListener('change', () => {
    construire();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  });
}
