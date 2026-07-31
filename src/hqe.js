// SPRO — Démarche HQE présentée en nuancier déplié : six lames de teinte
// empilées, on en choisit une et son engagement s'affiche à côté. Textes repris
// mot pour mot de la page « Démarche HQE » de spro.fr.
//
// Les six engagements s'appuient sur un visuel réel de l'entreprise ou du
// fabricant : panneaux solaires filmés, véhicule électrique, protections de
// sol, une vidéo du local de tri pour ECODDS (2026-07-29, filmée au téléphone
// donc au format portrait — seul média du panneau dans ce sens, d'où
// `portrait:true` plus bas), et depuis le 2026-07-30 les vidéos de présentation
// Unikalo pour les deux gammes Naé et Aqualine (fournies par le user telles
// quelles, logos et textes fabricant à l'écran assumés).
//
// Étape précédente pour les gammes, abandonnée depuis : une photo produit
// (packshot fabricant, 225 px seulement) puis une carte de teinte peinte —
// remplacées maintenant par les vidéos ci-dessus.
(function(){
  const deck = document.getElementById('hqeDeck');
  const volet = document.getElementById('hqeVolet');
  if (!deck || !volet) return;

  const BASE = deck.dataset.media || '';

  // Palette : registre écologique ancré sur le logo SPRO. Le **bleu du logo**
  // (#004D95) revient tel quel sur Aqualine — une peinture en phase aqueuse — et
  // le **taupe du logo** sur Nerpel, dont les protections sont en kraft ; il est
  // foncé de #ADA095 à #7A6E60, sans quoi le blanc n'y tenait qu'à 2,5:1. Le
  // **bordeaux du logo** ouvre la série sur ECODDS : c'est le seul engagement
  // qui parle de déchets dangereux, solvants et aérosols — le rouge y dit la
  // vigilance, pas la décoration. Les trois couleurs du logo sont ainsi
  // réparties sur la pile. Toutes les lames dépassent
  // 4,5:1 en blanc — les anciennes « panneaux solaires » et « biosourcées »
  // tombaient à 3,0 et 3,5:1, illisibles.
  const ENGAGEMENTS = [
    { num:'01 — ECODDS', teinte:'#98162F', nom:'ECODDS', sujet:'Tri et recyclage des déchets de chantier',
      titre:'Collecte et recyclage ECODDS',
      texte:"SPRO participe au dispositif ECODDS afin d'assurer la collecte, le tri et le recyclage des déchets issus de ses chantiers. Cette organisation permet de limiter l'impact environnemental de nos activités tout en garantissant une gestion responsable des déchets professionnels.",
      liste:['Pots de peinture et vernis','Bidons et emballages souillés','Aérosols et solvants','Bâches et films plastiques','Outillage de peinture','Déchets diffus spécifiques DDS'],
      video:BASE + '/media/hqe-ecodds.mp4', poster:'/img/hqe-ecodds-poster.webp', portrait:true,
      legende:'Collecte et tri des déchets de peinture (ECODDS) au local de tri SPRO' },

    { num:'02 — Mobilité', teinte:'#1A5A63', nom:'Parc électrique', sujet:'Véhicules électriques',
      titre:'Parc automobile électrique',
      texte:"Afin de réduire nos émissions de CO₂, notre parc automobile de bureau est composé de véhicules électriques. Cette démarche participe à une mobilité plus propre et limite l'empreinte carbone liée aux déplacements quotidiens de l'entreprise.",
      image:'/img/hqe-parc-electrique.webp',
      // Le ciel a été coupé de moitié pour supprimer un fil électrique qui
      // barrait l'image : elle est passée de 16/10 à un format allongé (2,04).
      // `panoramique` donne au cadre ce format-là, sinon `object-fit:cover`
      // rognerait les côtés — donc les véhicules, qui sont le sujet.
      panoramique:true,
      legende:"Véhicule électrique du parc SPRO devant les locaux de l'entreprise" },

    { num:'03 — Énergie', teinte:'#8A6A2E', nom:'Panneaux solaires', sujet:'Énergie solaire autoproduite',
      titre:'Panneaux solaires',
      texte:"Nos locaux sont équipés de panneaux solaires produisant une énergie renouvelable utilisée au quotidien pour alimenter nos bureaux, contribuer au chauffage des locaux et assurer la recharge de nos véhicules électriques.",
      liste:['Recharge des véhicules électriques','Alimentation des bureaux','Participation au chauffage des locaux'],
      video:BASE + '/media/hqe-panneaux.mp4', poster:'/img/hqe-panneaux-poster.webp',
      legende:"Panneaux solaires sur la toiture de l'entreprise, Z.I. du Prat à Vannes" },

    { num:'04 — Naé', teinte:'#4E6B33', nom:'Peintures biosourcées', sujet:'Composants naturels et renouvelables',
      titre:'Peintures biosourcées Naé',
      texte:"Nous privilégions l'utilisation de peintures biosourcées telles que la gamme Naé by Unikalo. Formulées à partir de composants naturels et renouvelables, elles s'inscrivent pleinement dans une démarche HQE tout en garantissant des performances techniques élevées et un meilleur confort pour les occupants.",
      video:BASE + '/media/hqe-nae.mp4', poster:'/img/hqe-nae-poster.webp',
      legende:'Gamme de peintures biosourcées Naé by Unikalo' },

    { num:'05 — Aqualine', teinte:'#004D95', nom:'Bas carbone', sujet:'Formulation éco-conçue en phase aqueuse',
      titre:'Peintures bas carbone Aqualine',
      texte:"La gamme Aqualine by Unikalo s'intègre dans notre démarche de réduction de l'empreinte carbone grâce à une formulation éco-conçue associant performance, durabilité et respect de l'environnement.",
      liste:['Haut rendement',"Confort d'application",'Faibles émissions de COV',"Réduction de l'empreinte carbone"],
      video:BASE + '/media/hqe-aqualine.mp4', poster:'/img/hqe-aqualine-poster.webp',
      legende:'Gamme de peintures bas carbone Aqualine Evo by Unikalo' },

    { num:'06 — Nerpel', teinte:'#7A6E60', nom:'Protections', sujet:'Matériaux responsables et recyclables',
      titre:'Protections Nerpel',
      texte:"Pour limiter l'impact environnemental de nos chantiers, nous utilisons des protections Nerpel conçues à partir de matériaux responsables et recyclables.",
      liste:['Certification PEFC',"Jusqu'à 7 recyclages possibles",'Faibles émissions','Biodégradable','Issu de la nature'],
      image:'/img/hqe-protections.webp',
      legende:'Protections de sol Nerpel déroulées sur toute la surface, chantier SPRO' },
  ];

  const teinter = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = c => k >= 0 ? Math.min(255, Math.round(c + (255 - c) * k))
                          : Math.max(0, Math.round(c * (1 + k)));
    return `rgb(${f(n>>16 & 255)},${f(n>>8 & 255)},${f(n & 255)})`;
  };

  const lames = [];
  let actif = 0;

  ENGAGEMENTS.forEach((e, i) => {
    const b = document.createElement('button');
    b.className = 'hqe-lame';
    b.type = 'button';
    b.style.background = `linear-gradient(102deg, ${teinter(e.teinte,-.1)} 0%, ${e.teinte} 42%, ${teinter(e.teinte,.15)} 100%)`;
    b.innerHTML = `<span class="nom"></span><span class="num">${String(i+1).padStart(2,'0')}</span>`;
    b.querySelector('.nom').textContent = e.nom;
    b.setAttribute('aria-label', e.titre);
    b.addEventListener('click', () => choisir(i));
    b.addEventListener('keydown', ev => {
      const d = { ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1 }[ev.key];
      if (!d) return;
      ev.preventDefault();
      choisir((actif + d + ENGAGEMENTS.length) % ENGAGEMENTS.length);
      lames[actif].focus();
    });
    deck.appendChild(b);
    lames.push(b);
  });

  // Les lames sont empilées à plat, chacune lisible d'un coup d'œil. Le premier
  // dessin les disposait en éventail : plus beau, mais illisible — libellés
  // inclinés, lames qui se recouvrent, rien qui signalait qu'on pouvait cliquer.
  function placer(){
    lames.forEach((l, j) => {
      const sorti = j === actif;
      l.classList.toggle('actif', sorti);
      l.setAttribute('aria-pressed', String(sorti));
    });
  }

  function media(e, i){
    if (e.video) {
      // Seule la vidéo ECODDS est au format portrait (filmée au téléphone) : le
      // panneau est pensé pour du paysage (`object-fit:cover` en 16/10), ce qui
      // la recadrerait en une mince bande zoomée. `hqe-media-portrait` bascule
      // en `contain` sur fond sombre pour la montrer entière, en incrustation.
      const cls = e.portrait ? ' class="hqe-media-portrait"' : '';
      return `<video${cls} src="${e.video}" poster="${e.poster}" muted loop playsinline autoplay
                     preload="metadata" aria-label="${e.legende}"></video>
              <figcaption>${e.legende}</figcaption>`;
    }
    if (e.image) {
      return `<img src="${e.image}" alt="${e.legende}" loading="lazy">
              <figcaption>${e.legende}</figcaption>`;
    }
    // La gamme au complet, alignée sur fond blanc : impression puis les trois
    // finitions. Composée à partir des photos produit de la boutique du user,
    // chaque fût détouré et ramené à une hauteur commune — celle du plus petit,
    // pour n'en agrandir aucun. Le panneau adopte le même blanc, l'image s'y
    // fond sans laisser voir son cadre.
    return `<div class="hqe-fut">
              <img src="${e.fut}" alt="${e.produit}" loading="lazy">
              <div class="ref">${e.produit}</div>
            </div>`;
  }

  function choisir(i){
    actif = i;
    placer();

    const e = ENGAGEMENTS[i];
    volet.innerHTML = `
      <div class="hqe-corps">
        <figure class="hqe-media${e.panoramique ? ' panoramique' : ''}">${media(e, i)}</figure>
        <div class="hqe-volet-num" style="color:${e.teinte}">${e.num}</div>
        <h3>${e.titre}</h3>
        <p>${e.texte}</p>
        ${e.liste ? `<ul class="hqe-points">${e.liste.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
      </div>`;
  }

  choisir(0);
})();
