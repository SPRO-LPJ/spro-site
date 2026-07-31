// SPRO — Couche premium : scroll fluide (Lenis), parallaxe, titres en masque,
// barre de progression, révélations, compteurs. Tout se dégrade proprement
// sans JS / en prefers-reduced-motion.
(function(){
  document.documentElement.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.getElementById('siteHeader');
  const progress = document.getElementById('scrollProgress');

  // UI liée au scroll : header solide + barre de progression.
  const onScrollUI = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('scrolled', y > window.innerHeight * 0.9);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  };

  // Le formulaire de contact vit dans src/contact.js (envoi réel).

  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  const allReveals = reveals;
  const counts = Array.from(document.querySelectorAll('[data-count]'));
  const hasGSAP = typeof gsap !== 'undefined';

  const showAll = () => {
    allReveals.forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    document.querySelectorAll('[data-reveal-promo]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    counts.forEach(el => { el.textContent = el.dataset.count; });
    document.querySelectorAll('#domaines .split').forEach(sp => sp.classList.add('in-view'));
    document.querySelectorAll('.partners').forEach(p => p.classList.add('in-view'));
  };

  if (reduce || !hasGSAP) {
    showAll();
    window.addEventListener('scroll', onScrollUI, { passive: true });
    onScrollUI();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---- Scroll fluide (Lenis) piloté par le ticker GSAP ----
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    // lerp 0,09 mettait 1,4 s à poser un simple coup de molette : le site entier
    // paraissait flotter. 0,15 garde le glissé sans le retard.
    lenis = new Lenis({ lerp: 0.2, smoothWheel: true, wheelMultiplier: 1 });
    window.lenis = lenis;
    lenis.on('scroll', () => { ScrollTrigger.update(); onScrollUI(); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // Ancres avec décalage sous le header fixe.
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id && id.length > 1) { e.preventDefault(); lenis.scrollTo(id, { offset: -72 }); }
      });
    });
  } else {
    window.addEventListener('scroll', onScrollUI, { passive: true });
  }
  onScrollUI();

  // ---- Révélations (titres, blocs, cartes, texte) via IntersectionObserver ----
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      gsap.to(entry.target, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', delay: (i % 6) * 0.06 });
      revObs.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(el => revObs.observe(el));

  // ---- Parallaxe sur les images (profondeur au scroll) ----
  const parallax = (img, amount) => gsap.fromTo(img,
    { yPercent: -amount },
    { yPercent: amount, ease: 'none',
      scrollTrigger: { trigger: img.closest('.real-card, .dom-media') || img, start: 'top bottom', end: 'bottom top', scrub: true } }
  );
  document.querySelectorAll('.real-card .rc-img').forEach(img => parallax(img, 6));
  // La photo affichée en entier est exclue : la parallaxe la ferait sortir de son cadre.
  document.querySelectorAll('.dom-media:not(.entiere) img').forEach(img => parallax(img, 6));

  // ---- Photo domaines : dévoilement par balayage latéral + léger dézoom ----
  // Effet en TRANSITION CSS (indépendant de GSAP) → infaillible, jamais de photo invisible.
  const domPhoto = document.querySelector('.domaines-photo');
  if (domPhoto) {
    const dImg = domPhoto.querySelector('img');
    const cover = document.createElement('div');
    cover.className = 'photo-cover';
    domPhoto.appendChild(cover);
    dImg.style.transform = 'scale(1.12)';
    dImg.style.transition = 'transform 1.5s cubic-bezier(.2,.7,.2,1)';
    let revealed = false;
    const reveal = () => { if (revealed) return; revealed = true; domPhoto.classList.add('revealed'); dImg.style.transform = 'scale(1)'; };
    const checkPhoto = () => { if (domPhoto.getBoundingClientRect().top < window.innerHeight * 0.82) reveal(); };
    if (lenis) lenis.on('scroll', checkPhoto);
    window.addEventListener('scroll', checkPhoto, { passive: true });
    checkPhoto();
    // Filet de sécurité : si le seuil de scroll n'a jamais été franchi (photo
    // déjà à l'écran au chargement, navigation directe par ancre, etc.), on
    // révèle quand même après un court délai — jamais de photo invisible.
    window.addEventListener('load', () => setTimeout(reveal, 2500));
  }

  // ---- Marchés privé / public : arrivée latérale (gauche / droite) au scroll ----
  const marketSplits = Array.from(document.querySelectorAll('#domaines .split'));
  const checkSplits = () => {
    marketSplits.forEach(sp => {
      if (!sp.classList.contains('in-view') && sp.getBoundingClientRect().top < window.innerHeight * 0.85) sp.classList.add('in-view');
    });
  };
  if (lenis) lenis.on('scroll', checkSplits);
  window.addEventListener('scroll', checkSplits, { passive: true });
  checkSplits();
  // Filet de sécurité : même logique que la photo domaines — si le seuil de
  // scroll n'est jamais franchi, on révèle quand même après un court délai.
  window.addEventListener('load', () => setTimeout(() => marketSplits.forEach(sp => sp.classList.add('in-view')), 2500));

  // ---- Avis ----
  // L'ancienne bande épinglée qui défilait horizontalement au scroll a été
  // retirée : elle imposait 3 607 px de défilement (13,5 % de la page) pour
  // sept témoignages. Les avis sont désormais trois cartes en grille statique,
  // sous un bandeau qui porte la note et le lien vers la fiche Google — plus
  // rien à mesurer ni à synchroniser ici.
  // `window.__avisRefresh` reste défini pour reviews.js, qui l'appelle après
  // avoir remplacé les cartes : sans lui, GSAP garderait des positions calées
  // sur l'ancienne hauteur de section.
  window.__avisRefresh = () => { try { ScrollTrigger.refresh(); } catch (e) {} };

  // ---- Partenaires : logos qui apparaissent un par un au scroll ----
  const partners = document.querySelector('.partners');
  if (partners) {
    const checkPartners = () => { if (!partners.classList.contains('in-view') && partners.getBoundingClientRect().top < window.innerHeight * 0.82) partners.classList.add('in-view'); };
    if (lenis) lenis.on('scroll', checkPartners);
    window.addEventListener('scroll', checkPartners, { passive: true });
    checkPartners();
  }

  // ---- Promo secteur plein écran façon annonce pub : s'ouvre uniquement au
  // clic sur le bouton doré de la carte "Peinture au pistolet airless"
  // (Nos réalisations) — plus d'ouverture auto au scroll, ça sautait trop
  // aux yeux, et plus d'onglet accroché sur le côté : on la rouvre par la
  // carte. Fermable par la croix. ----
  const promo = document.getElementById('promoAirless');
  const promoScroll = document.getElementById('promoScroll');
  if (promo) {
    const closeBtn = promo.querySelector('.promo-close');
    const scrollHint = document.getElementById('promoScrollHint');
    const cardCta = document.getElementById('airlessCardCta');

    // `promo-ouverte` sur <body> efface le header et la jauge de scroll le
    // temps de l'annonce (voir styles.css) : la section est sous la topbar
    // dans l'ordre d'empilement, un z-index plus haut n'y change rien.
    const fermer = () => {
      promo.classList.add('closing');
      document.body.classList.remove('promo-ouverte');
      setTimeout(() => { promo.classList.remove('visible', 'closing'); }, 400);
    };
    // Révélation du contenu au scroll INTERNE de l'overlay, par mesure de
    // position — et NON via IntersectionObserver : l'observateur créé au
    // chargement, alors que le panneau est encore `visibility:hidden`, ne se
    // redéclenchait jamais à l'ouverture et laissait tout le texte à
    // opacity 0. Même mécanique que la photo domaines : on mesure, on révèle.
    const promoReveals = Array.from(promo.querySelectorAll('[data-reveal-promo]'));
    let promoDelai = 0;
    const revelerPromo = () => {
      const hauteur = promoScroll ? promoScroll.clientHeight : window.innerHeight;
      promoReveals.forEach((el) => {
        if (el.classList.contains('revele')) return;
        if (el.getBoundingClientRect().top > hauteur * 0.94) return;
        // Décalage en cascade via transition-delay CSS (pas de tween GSAP :
        // voir le commentaire de [data-reveal-promo] dans styles.css).
        el.style.transitionDelay = ((promoDelai++ % 6) * 0.06) + 's';
        el.classList.add('revele');
      });
    };
    if (promoScroll) promoScroll.addEventListener('scroll', revelerPromo, { passive: true });

    const ouvrir = () => {
      promo.classList.remove('closing');
      promo.classList.add('visible');
      document.body.classList.add('promo-ouverte');
      if (promoScroll) promoScroll.scrollTop = 0;
      if (scrollHint) scrollHint.classList.remove('masque');
      promoDelai = 0;
      // Une fois le panneau réellement peint, on révèle ce qui est à l'écran.
      // Le second passage couvre le cas où la transition d'ouverture décale
      // encore la mise en page — jamais de texte laissé invisible.
      requestAnimationFrame(revelerPromo);
      setTimeout(revelerPromo, 450);
    };

    if (cardCta) cardCta.addEventListener('click', (e) => {
      // La carte porte data-galerie : sans ça, le clic remonterait aussi
      // jusqu'à galerie.js et ouvrirait la visionneuse par-dessus l'annonce.
      e.stopPropagation();
      ouvrir();
    });
    closeBtn.addEventListener('click', fermer);

    // Tout lien interne cliqué pendant que l'annonce est ouverte la ferme :
    // ceux de l'annonce elle-même (« Nous contacter » → #contact) comme ceux
    // du header, qui reste utilisable par-dessus. Sans ça l'ancre défilait
    // DERRIÈRE l'overlay et il ne se passait visiblement rien.
    // Écouteur délégué sur le document : le header n'est pas dans `promo`, et
    // ça couvre aussi le menu mobile, construit après coup. Pas de
    // preventDefault — le gestionnaire d'ancres garde la main sur le
    // défilement. Les liens externes (boutique, target="_blank") sont ignorés.
    document.addEventListener('click', (e) => {
      if (!promo.classList.contains('visible')) return;
      const lien = e.target.closest('a[href^="#"]');
      if (lien) fermer();
    });

    // Pastille "Continuez à lire" : masquée dès qu'on commence à scroller
    // dans l'annonce, inutile une fois que le message est passé.
    if (scrollHint && promoScroll) {
      promoScroll.addEventListener('scroll', () => {
        if (promoScroll.scrollTop > 40) scrollHint.classList.add('masque');
      }, { passive: true });
    }
  }

  // ---- Baseline de la carte 13 : la phrase se construit à l'arrivée ----
  // Les trois propositions entrent l'une après l'autre, floues puis nettes.
  // Pas de pulsation lumineuse : une première version faisait clignoter
  // « Nous peignons. » en bleu vif, c'était agressif à l'œil. L'entrée en
  // cascade suffit à accrocher le regard, la couleur fait le reste.
  // En GSAP et non en transition CSS : le déclenchement dépend du scroll, et
  // ScrollTrigger est déjà la mécanique du reste de la page.
  const baseline = document.querySelector('.rc-baseline');
  if (baseline && !reduce) {
    const morceaux = baseline.querySelectorAll('i');
    gsap.set(morceaux, { opacity: 0, y: 14, filter: 'blur(7px)' });
    gsap.to(morceaux, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: .62, ease: 'power3.out', stagger: .13,
      scrollTrigger: { trigger: baseline, start: 'top 88%', once: true },
    });
  }

  // ---- Diaporama de la carte 13 « Peinture au pistolet airless » ----
  // Les photos viennent du même manifeste que la visionneuse (clé « airless »),
  // donc rien à coder en dur : déposer les fichiers dans masters/galeries/ puis
  // lancer `node scripts/optimiser-galeries.mjs` suffit à l'alimenter. Sans
  // photo, la carte garde simplement son dégradé.
  const diapo = document.getElementById('airlessDiapo');
  if (diapo) {
    const MAX_VIGNETTES = 5; // au-delà, la rangée déborde et chaque photo rétrécit
    fetch('/img/galeries/index.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((manifeste) => {
        const photos = manifeste && manifeste.airless;
        if (!photos || !photos.length) return;
        photos.slice(0, MAX_VIGNETTES).forEach((src, i) => {
          // Chaque photo vit dans une « lame » inclinée : c'est elle qui porte
          // la coupe en biais, l'image étant contre-inclinée (voir styles.css).
          const lame = document.createElement('span');
          lame.className = 'rc-lame';
          const img = document.createElement('img');
          img.src = src;
          img.alt = 'Rendu de finition obtenu à la peinture au pistolet Airless';
          img.loading = i < 2 ? 'eager' : 'lazy';
          img.decoding = 'async';
          lame.appendChild(img);
          diapo.appendChild(lame);
        });
      })
      .catch(() => { /* pas de manifeste : la carte reste en dégradé */ });
  }

  // ---- Élan directionnel au clic sur « Rejoindre l'aventure SPRO » ----
  const joinCta = document.getElementById('joinCta');
  if (joinCta) {
    joinCta.addEventListener('click', () => {
      joinCta.classList.remove('clicked');
      void joinCta.offsetWidth; // relance l'animation même sur clics rapprochés
      joinCta.classList.add('clicked');
    });
  }

  // ---- Compteurs (80 % / 20 %) ----
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target, target = +el.dataset.count, obj = { v: 0 };
      gsap.to(obj, { v: target, duration: 1.4, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(obj.v); } });
      countObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  counts.forEach(el => countObs.observe(el));

  // Recalcule après chargement complet (vidéo/images).
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // Filet de sécurité anti-invisible. Couvre aussi les morceaux de la baseline
  // de la carte 13 : ils partent à opacity 0 et ne dépendent que d'un
  // ScrollTrigger. Si celui-ci ne se déclenche jamais — arrivée par une ancre,
  // scroll très rapide, mesure faussée —, la phrase resterait invisible pour
  // toujours. C'est exactement ce qui était arrivé à la photo des domaines.
  window.addEventListener('load', () => setTimeout(() => {
    const aSauver = reveals.concat(Array.from(document.querySelectorAll('.rc-baseline i')));
    aSauver.forEach(el => {
      if (parseFloat(getComputedStyle(el).opacity) === 0) {
        el.style.opacity = 1; el.style.transform = 'none'; el.style.filter = 'none';
      }
    });
  }, 2500));

  // ---- Vidéos de canal (boutique) : visionneuse maison ----
  // Auparavant on appelait le plein écran NATIF (`requestFullscreen` /
  // `webkitEnterFullscreen`). Problème : la vidéo n'a pas d'attribut
  // `controls`, et Safari n'affiche alors aucune commande en plein écran —
  // une fois dedans, plus rien à cliquer pour sortir. On ouvre donc une
  // couche maison avec une vraie croix, comme la visionneuse de la galerie
  // (mêmes conventions : Échap, clic sur le fond, verrou de défilement).
  const videosCanal = document.querySelectorAll('.canal-video');
  if (videosCanal.length) {
    let couche = null;

    const fermerVideo = () => {
      if (!couche) return;
      couche.remove();
      couche = null;
      document.documentElement.classList.remove('gal-ouverte');
      if (window.lenis) window.lenis.start();
    };

    const ouvrirVideo = (source) => {
      fermerVideo();
      couche = document.createElement('div');
      couche.className = 'video-plein';

      const lecteur = document.createElement('video');
      // `currentSrc` et non `src` : c'est la piste réellement retenue par le
      // navigateur, et elle est déjà en cache — l'ouverture est immédiate.
      lecteur.src = source.currentSrc || source.src;
      lecteur.poster = source.poster;
      lecteur.controls = true;
      lecteur.autoplay = true;
      lecteur.loop = true;
      lecteur.playsInline = true;
      // Le son reste coupé au départ : la vignette est muette, un démarrage
      // sonore en plein écran surprendrait. Les commandes permettent de
      // l'activer.
      lecteur.muted = true;

      const croix = document.createElement('button');
      croix.type = 'button';
      croix.className = 'video-plein-fermer';
      croix.setAttribute('aria-label', 'Fermer la vidéo');
      croix.textContent = '✕';

      couche.appendChild(lecteur);
      couche.appendChild(croix);
      document.body.appendChild(couche);

      croix.addEventListener('click', fermerVideo);
      // Clic sur le fond seulement : sans ce test, un clic sur les commandes
      // de lecture fermerait la visionneuse.
      couche.addEventListener('click', (e) => { if (e.target === couche) fermerVideo(); });

      document.documentElement.classList.add('gal-ouverte');
      if (window.lenis) window.lenis.stop();
      croix.focus();
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fermerVideo();
    });

    videosCanal.forEach((video) => {
      video.style.cursor = 'pointer';
      video.addEventListener('click', () => ouvrirVideo(video));
    });
  }
})();
