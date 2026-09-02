// SPRO — Hero en lecture automatique (2026-07-28).
//
// Jusqu'ici la vidéo était scrubée au scroll (position = fonction du scroll,
// piste de plusieurs écrans, canvas de rendu pour contourner un bug Safari sur
// les vidéos scrubées à l'arrêt). Le user a demandé l'inverse : la vidéo se
// lance seule à l'arrivée, ralentie pour un rendu posé, et le scroll redevient
// un scroll de page ordinaire — indépendant de la vidéo, qui continue de jouer
// en fond. Plus de piste géante ni de canvas : une vidéo qui joue vraiment
// s'affiche normalement, y compris sous Safari.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = document.getElementById('heroVideo');
  if (!video) return;

  // Secteurs traversés par la vidéo, dans l'ordre. `until` = fin du secteur sur
  // la timeline vidéo (0..1), pour afficher le bon nom pendant la lecture.
  //
  // (2026-07-29) Nouveau montage envoyé par le user : 153,987 s, contenu et
  // ordre entièrement différents du précédent (85,75 s). Réintroduit
  // concessionnaire / supermarché / thalasso en ouverture — voulu cette fois,
  // ce n'est pas un reliquat de l'ancien montage. Fractions recalculées image
  // par image (relecture seconde par seconde de tout le montage). Noms
  // alignés sur les intitulés exacts de la section Réalisations (data-galerie)
  // pour rester cohérent avec le reste du site — même client, deux passages
  // possibles : le plan de façade seule (travail de ravalement) est étiqueté
  // « Ravalement extérieur », le plan d'intérieur porte le nom du métier
  // (Magasin, Accueil, etc.). Le supermarché (« Netto », lu à l'image) reste
  // un seul secteur malgré les deux angles filmés — pas de plan de ravalement
  // séparé pour celui-ci. Seule la façade Specialized, elle, précède son
  // intérieur (Magasin) sous « Ravalement extérieur » — recalculer TOUTES ces
  // fractions si le montage rebouge.
  // (2026-09-02) Troisième montage : 148,065 s, contre 153,987 s. L'ordre des
  // douze secteurs est inchangé, seul l'enchaînement a bougé — la séquence
  // d'ouverture sur la concession a été remplacée, ce qui décale tout le reste.
  // Les fractions ne pouvaient donc pas être simplement mises à l'échelle : le
  // premier secteur passe de 33,0 s à 24,8 s alors que la durée totale ne perd
  // que 5,9 s. Elles ont été relevées à l'image, en secondes puis converties.
  // Rappel de la convention conservée depuis le premier montage : le plan de
  // façade seule d'un chantier est étiqueté « Ravalements extérieurs », le plan
  // d'intérieur porte le nom du métier — d'où la façade Specialized (66-72 s)
  // suivie de son magasin de vélos.
  const SECTORS = [
    { name: 'Concessions automobile', until: 0.1823 },       //  →  27,0 s
    { name: 'Hyper/Supermarchés', until: 0.2377 },           //  →  35,2 s
    { name: 'Hôtellerie & Thalasso', until: 0.3816 },        //  →  56,5 s
    { name: 'Ravalements extérieurs', until: 0.4893 },       //  →  72,5 s
    { name: 'Magasins', until: 0.5808 },                     //  →  86,0 s
    { name: 'Accueils', until: 0.6236 },                     //  →  92,3 s
    { name: 'Restaurants & Bars', until: 0.6817 },           //  → 100,9 s
    { name: 'Bureaux', until: 0.7159, fadeAt: 0.62 },        //  → 106,0 s
    { name: 'Salons de coiffure', until: 0.7465, fadeAt: 0.62 }, // → 110,5 s
    { name: 'Maisons de retraite', until: 0.8281 },          //  → 122,6 s
    { name: 'Écoles', until: 0.9050 },                       //  → 134,0 s
    { name: 'Espaces communs résidentiels', until: 1.00 },   //  → 148,1 s
  ];

  const secIdx = document.getElementById('secIdx');
  const secName = document.getElementById('secName');
  const railFill = document.getElementById('railFill');
  const sectorFlag = document.querySelector('.sector-flag');
  const heroCopy = document.getElementById('heroCopy');
  const topbar = document.querySelector('.topbar');

  // Vitesse native (1×) partout, sans exception. Une accélération par secteur
  // (`playbackRate` à 1,3) avait été posée pour raccourcir les plans longs :
  // retirée sur demande du user (« je ne veux pas de faux mouvement »). Elle
  // avait deux défauts réels — le mouvement de caméra n'était plus à sa vitesse
  // de tournage, et le changement de débit tombait d'un coup à la frontière de
  // secteur, ce qui se voyait comme un à-coup. Si un plan traîne, la réponse
  // est de le raccourcir au montage, pas d'accélérer la lecture.
  video.loop = true;

  // Démarrage : `play()` peut être refusé tant qu'aucun geste n'a eu lieu (et
  // Safari ne peint pas toujours une vidéo jamais lue). On réessaie au premier
  // geste, une seule fois, sans jamais empiler d'écouteurs.
  const demarrer = () => video.play().catch(() => {});

  // La balise porte `preload="none"` : rien n'est téléchargé avec la page, le
  // poster tient l'écran. On ne demande la vidéo (73-76 Mo) qu'une fois le
  // reste de la page rendu, pour que le LCP mesuré par Google soit le poster
  // et non le film. `load()` est nécessaire ici : sans lui, `preload="none"`
  // laisse l'élément sans source chargée et `play()` resterait sans effet.
  const chargerPuisJouer = () => { video.load(); demarrer(); };
  if (document.readyState === 'complete') chargerPuisJouer();
  else window.addEventListener('load', chargerPuisJouer, { once: true });
  const relance = () => { demarrer(); retirerRelance(); };
  const GESTES = ['pointerdown', 'keydown', 'touchstart'];
  const retirerRelance = () => GESTES.forEach((g) => window.removeEventListener(g, relance));
  GESTES.forEach((g) => window.addEventListener(g, relance, { passive: true, once: false }));

  // Le logo du header prend le relais du grand logo du hero au même instant
  // que l'accroche s'efface (ci-dessous pour le reste de l'animation) — même
  // en mouvement réduit, où l'accroche reste fixe, sinon la marque
  // disparaîtrait purement et simplement du header.
  const ACCROCHE_DUREE = 4500;
  setTimeout(() => topbar.classList.add('marque-visible'), reduce ? 0 : ACCROCHE_DUREE);

  if (reduce) return; // mouvement réduit : vidéo posée, pas d'animation de secteur

  // Opacité du nom de secteur selon la progression DANS le secteur : il
  // surgit à l'entrée, tient le temps qu'on le lise, puis s'efface avant la
  // fin — le secteur suivant le fait réapparaître. `debut` (0.86 par défaut)
  // est le point où l'effacement démarre ; certains secteurs très courts,
  // suivis d'un enchaînement rapide vers autre chose, le passent plus tôt
  // (voir `fadeAt` sur ces entrées de SECTORS) pour ne pas traîner jusqu'à la
  // coupe suivante.
  // Palier allongé et fondus resserrés (2026-07-31) : le nom est blanc pur,
  // mais il passait un quart de chaque secteur entre 15 % et 50 % d'opacité et
  // se lisait donc gris la plupart du temps. Entrée 0,05 → 0,03, sortie
  // déclenchée à 0,86 au lieu de 0,75 et étalée sur 0,12 au lieu de 0,20 : le
  // nom tient désormais à pleine intensité sur ~83 % du secteur, contre ~70 %,
  // sans supprimer l'apparition et l'effacement qui font l'effet.
  const opacitePavillon = (l, debut) => {
    debut = debut == null ? 0.86 : debut;
    if (l < 0.03) return l / 0.03;
    if (l < debut) return 1;
    if (l < debut + 0.12) return 1 - (l - debut) / 0.12;
    return 0;
  };

  let curSec = -1;
  let accrocheEffacee = false;

  // L'affichage suivait `timeupdate`, qui ne se déclenche que ~4 fois par
  // seconde : la barre de progression avançait donc par paliers de 250 ms,
  // visiblement saccadés. Elle est maintenant peinte dans une boucle
  // `requestAnimationFrame`, alignée sur le rafraîchissement de l'écran.
  const majUI = () => {
    const dur = video.duration;
    if (!dur) return;
    const p = video.currentTime / dur;

    // `scaleY` au lieu de `height` : une transformation reste sur le
    // compositeur (GPU), alors qu'écrire une hauteur en pourcentage force le
    // navigateur à recalculer la mise en page à chaque image.
    railFill.style.transform = 'scaleY(' + p.toFixed(4) + ')';

    let idx = SECTORS.findIndex((s) => p < s.until);
    if (idx === -1) idx = SECTORS.length - 1;

    if (idx !== curSec) {
      curSec = idx;
      secName.textContent = SECTORS[idx].name;
      secIdx.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(SECTORS.length).padStart(2, '0');
    }

    // Le nom de secteur n'apparaît qu'une fois l'accroche effacée (ci-dessous,
    // ~4,5 s après le chargement) : les deux se chevauchaient sinon, superposés
    // au centre du hero. Gardé sur l'horloge de la page (`accrocheEffacee`),
    // pas sur `video.currentTime` : la vidéo boucle et repasse par 0 toutes les
    // ~4 min, ce qui masquait le secteur en cours à chaque boucle sinon.
    if (!accrocheEffacee) {
      sectorFlag.style.opacity = '0';
    } else {
      const debut = idx === 0 ? 0 : SECTORS[idx - 1].until;
      const fin = SECTORS[idx].until;
      const local = fin > debut ? Math.min(1, Math.max(0, (p - debut) / (fin - debut))) : 1;
      sectorFlag.style.opacity = opacitePavillon(local, SECTORS[idx].fadeAt).toFixed(3);
      sectorFlag.style.transform = 'translateY(' + (local * -14).toFixed(1) + 'px)';
    }
  };

  // La boucle ne tourne que lorsque le hero est réellement à l'écran. Une fois
  // le visiteur descendu dans la page, décoder une vidéo plein écran qu'il ne
  // voit pas coûte du CPU, du GPU et de la batterie pour rien ; on met en
  // pause et on relance à son retour. Idem quand l'onglet passe en arrière-plan.
  let rafId = 0;
  const boucler = () => { rafId = requestAnimationFrame(boucler); majUI(); };
  const lancerBoucle = () => { if (!rafId) boucler(); };
  const stopperBoucle = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };

  const stage = document.querySelector('.hero-stage') || video.parentElement;

  // ---- Ambiance sonore ----
  // Le son est ACTIF par défaut : il démarre dès l'arrivée sur le hero.
  //
  // Mais aucun navigateur ne laisse un son se lancer sans un premier geste du
  // visiteur — c'est la politique d'autoplay de Chrome, Safari et Firefox, pas
  // un réglage du site. On fait donc au plus près :
  //   1. tentative de lecture immédiate — elle passe si le visiteur a déjà
  //      interagi avec le site dans cet onglet, ou si le navigateur estime
  //      qu'il le fréquente assez ;
  //   2. sinon, la lecture est armée sur le tout premier clic, appui clavier
  //      ou toucher, n'importe où dans la page. Le visiteur n'a rien à
  //      chercher, le son part de lui-même à son premier mouvement.
  // Le son ne vit que sur le hero : il s'estompe dès qu'on descend et reprend
  // au retour. Et un refus explicite est mémorisé — quelqu'un qui coupe le son
  // ne le retrouve pas allumé à sa visite suivante.
  const audio = document.getElementById('heroAudio');
  const boutonSon = document.getElementById('heroSon');
  let fondu = 0;

  const VOLUME_MAX = 0.35; // une ambiance, pas une sono
  const CLE = 'spro-son-hero';
  // Actif par défaut ; seul un refus explicite ('0') l'éteint.
  let sonVoulu = (() => { try { return localStorage.getItem(CLE) !== '0'; } catch (e) { return true; } })();

  // Fondu manuel plutôt qu'une coupure sèche : un son qui s'arrête net au
  // milieu d'une mesure s'entend comme un bug. Déclaré hors du bloc
  // conditionnel, la mise en pause au scroll s'en servant aussi.
  const allerVers = (cible, duree = 700) => {
    if (!audio) return;
    cancelAnimationFrame(fondu);
    const depart = audio.volume;
    const t0 = performance.now();
    const pas = (t) => {
      const p = Math.min(1, (t - t0) / duree);
      audio.volume = Math.max(0, Math.min(1, depart + (cible - depart) * p));
      if (p < 1) fondu = requestAnimationFrame(pas);
      else if (cible === 0) audio.pause();
    };
    fondu = requestAnimationFrame(pas);
  };
  const couperSon = () => { if (audio && !audio.paused) allerVers(0, 500); };

  if (audio && boutonSon) {
    const majBouton = () => {
      boutonSon.setAttribute('aria-pressed', String(sonVoulu));
      boutonSon.setAttribute('aria-label', sonVoulu ? "Couper le son de l'ambiance" : "Activer le son de l'ambiance");
    };

    // Armé une seule fois : au premier geste du visiteur, la lecture part.
    // Retiré dès qu'il a servi pour ne pas relancer le son que quelqu'un
    // viendrait justement de couper.
    let armé = false;
    // Liste large à dessein. Les navigateurs n'accordent l'autorisation de
    // jouer un son qu'après une « activation » : clic, touche, fin de toucher.
    // La molette et le défilement n'en font PAS partie — un visiteur qui se
    // contente de scroller ne déclencherait jamais rien. On couvre donc tous
    // les gestes qui, eux, comptent, plutôt que les trois d'origine.
    const GESTES_SON = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend'];
    const surGeste = () => { desarmer(); if (sonVoulu) jouer(); };
    const desarmer = () => {
      armé = false;
      GESTES_SON.forEach((g) => document.removeEventListener(g, surGeste));
    };
    const armer = () => {
      if (armé) return;
      armé = true;
      GESTES_SON.forEach((g) => document.addEventListener(g, surGeste, { passive: true }));
    };

    const jouer = () => {
      audio.volume = 0;
      return audio.play()
        .then(() => { desarmer(); allerVers(VOLUME_MAX); boutonSon.classList.remove('attente'); })
        // Refus du navigateur : on n'éteint PAS le bouton — l'intention reste
        // « son actif », on attend simplement le geste qui la rendra possible.
        // On signale alors l'attente, puisqu'il faut un clic du visiteur.
        .catch(() => { armer(); boutonSon.classList.add('attente'); });
    };

    boutonSon.addEventListener('click', () => {
      sonVoulu = !sonVoulu;
      majBouton();
      boutonSon.classList.remove('attente');
      try { localStorage.setItem(CLE, sonVoulu ? '1' : '0'); } catch (e) {}
      if (sonVoulu) jouer(); else { desarmer(); allerVers(0, 400); }
    });

    // Toute la surface du hero déclenche le son. Le bouton en bas à droite
    // reste la commande explicite, mais viser une pastille de 40 px n'est pas
    // le premier réflexe : ici n'importe quel clic sur l'image suffit, ce qui
    // multiplie les occasions de fournir le geste que le navigateur réclame.
    // Le clic n'est intercepté QUE tant que la musique n'a pas démarré — après,
    // le hero redevient une image inerte.
    stage.addEventListener('click', (e) => {
      if (!sonVoulu || !audio.paused) return;
      if (e.target.closest('.hero-son')) return; // géré par le bouton lui-même
      jouer();
    });

    // Invitation affichée tant que le son n'a pas pu démarrer, retirée dès
    // qu'il joue — ou au bout de 12 s, pour ne pas laisser une consigne
    // clignoter indéfiniment devant quelqu'un qui n'en veut pas.
    setTimeout(() => boutonSon.classList.remove('attente'), 12000);

    // Tentative de lecture IMMÉDIATE, sans attendre la vérification du fichier.
    // Elle passait auparavant après un `fetch` HEAD, ce qui retardait de ~3 s
    // l'apparition de l'invitation « Cliquez pour le son » — le visiteur avait
    // déjà commencé à lire la page. Si la piste n'existe pas, `play()` échoue
    // en silence et le bouton reste masqué : rien de visible ne casse.
    majBouton();
    if (sonVoulu) jouer();

    // La vérification ne sert plus qu'à décider d'AFFICHER le bouton : sans
    // fichier déposé, le hero reste exactement comme avant.
    fetch(audio.getAttribute('src'), { method: 'HEAD' })
      .then((r) => { if (r.ok) boutonSon.hidden = false; })
      .catch(() => { /* pas de piste : le bouton reste masqué */ });
  }

  // Le hero a-t-il déjà été vu au moins une fois ? L'observateur émet un
  // premier appel dès l'observation, parfois « non visible » le temps que la
  // mise en page se stabilise. Cet appel-là coupait le son que la lecture
  // automatique venait tout juste de lancer : le visiteur revenu sur le site
  // après un premier clic n'entendait rien, alors que le navigateur avait
  // pourtant accordé l'autorisation. On n'interrompt donc qu'après une
  // première visibilité réelle.
  let heroDejaVu = false;
  const visible = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        heroDejaVu = true;
        demarrer(); lancerBoucle();
        // Reprise du son au retour sur le hero, sans nouvelle autorisation :
        // le geste initial du visiteur reste valable pour toute la session.
        // Le fondu de sortie a laissé le volume à zéro — sans le remonter ici,
        // la lecture repartait muette.
        if (sonVoulu && audio && audio.paused) {
          audio.volume = 0;
          audio.play().then(() => allerVers(VOLUME_MAX)).catch(() => {});
        }
      } else {
        video.pause(); stopperBoucle();
        if (heroDejaVu) couperSon();
      }
    },
    { threshold: 0 }
  );
  visible.observe(stage);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { video.pause(); stopperBoucle(); }
    else if (stage.getBoundingClientRect().bottom > 0) { demarrer(); lancerBoucle(); }
  });

  lancerBoucle();

  // L'accroche s'efface après quelques secondes de lecture, une fois le titre
  // lu — elle ne dépend plus du scroll, qui est désormais libre.
  setTimeout(() => {
    accrocheEffacee = true;
    heroCopy.style.transition = 'opacity .8s ease, transform .8s ease';
    heroCopy.style.opacity = '0';
    heroCopy.style.transform = 'translateY(-20px)';
  }, ACCROCHE_DUREE);
})();
