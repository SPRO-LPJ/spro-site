// SPRO — Consentement à la mesure d'audience (Google Analytics 4).
//
// Rien ne part chez Google avant un « Accepter » explicite : gtag.js n'est même
// pas téléchargé tant que le visiteur n'a pas choisi. C'est le mode « basique »
// du Consent Mode de Google, le seul qui ne prête pas à discussion avec la
// CNIL — le mode « avancé » envoie des signaux sans cookie avant le choix, et
// la CNIL considère que ces signaux demandent eux aussi un consentement.
//
// « Refuser » a exactement le même poids visuel qu'« Accepter » (exigence CNIL
// depuis 2021). Le choix est retenu six mois, dans un sens comme dans l'autre,
// puis redemandé. Tout lien portant [data-consentement-ouvrir] — « Gestion des
// cookies » dans le pied de page — rouvre le bandeau pour changer d'avis.
// Sans JavaScript, ce lien mène à la section Cookies de la politique de
// confidentialité, et rien n'est chargé.

const ID_MESURE = 'G-6DSCX1P79E';
const CLE = 'spro-consentement';
const SIX_MOIS_MS = 182 * 24 * 60 * 60 * 1000;
// Treize mois : la durée maximale que la CNIL admet pour un cookie de mesure
// d'audience. gtag.js en pose deux par défaut.
const TREIZE_MOIS_S = 395 * 24 * 60 * 60;
const DESACTIVATION = `ga-disable-${ID_MESURE}`;

let analyticsCharge = false;
let bandeau = null;
let ouvreur = null; // lien « Gestion des cookies » qui a ouvert le bandeau

const lireChoix = () => {
  try {
    const memo = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (!memo || (memo.choix !== 'accepte' && memo.choix !== 'refuse')) return null;
    if (Date.now() - memo.date > SIX_MOIS_MS) return null;
    return memo.choix;
  } catch (e) {
    return null; // stockage bloqué : le bandeau sera reproposé, rien n'est chargé
  }
};

const enregistrerChoix = (choix) => {
  try { localStorage.setItem(CLE, JSON.stringify({ choix, date: Date.now() })); } catch (e) { /* navigation privée */ }
};

const chargerAnalytics = () => {
  window[DESACTIVATION] = false;
  if (analyticsCharge) {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  analyticsCharge = true;
  window.dataLayer = window.dataLayer || [];
  // `arguments` et non un tableau : gtag.js ne reconnaît que cette forme.
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  // Mesure d'audience seulement : aucun usage publicitaire, même accepté.
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', ID_MESURE, {
    cookie_expires: TREIZE_MOIS_S,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID_MESURE}`;
  document.head.appendChild(script);
};

// Retrait du consentement : on coupe l'envoi et on efface les cookies déjà
// posés, sur le domaine exact comme sur le domaine parent (GA écrit sur
// `.spro.fr` quand il le peut).
const couperAnalytics = () => {
  window[DESACTIVATION] = true;
  if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
  const hote = location.hostname;
  const domaines = ['', `; domain=${hote}`, `; domain=.${hote.replace(/^www\./, '')}`];
  document.cookie.split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((nom) => nom === '_ga' || nom.startsWith('_ga_'))
    .forEach((nom) => domaines.forEach((d) => {
      document.cookie = `${nom}=; Max-Age=0; path=/${d}`;
    }));
};

const appliquerChoix = (choix) => {
  enregistrerChoix(choix);
  if (choix === 'accepte') chargerAnalytics();
  else couperAnalytics();
};

// Le focus revient au lien qui a ouvert le bandeau : sans ça, il tombe sur
// <body> et un visiteur au clavier perd sa place dans la page.
const fermerBandeau = () => {
  if (!bandeau) return;
  bandeau.remove();
  bandeau = null;
  if (ouvreur) ouvreur.focus();
  ouvreur = null;
};

// `focaliser` seulement quand le visiteur a demandé le bandeau : à l'arrivée
// sur la page, lui voler le focus renverrait le lecteur d'écran en bas de page.
const ouvrirBandeau = (focaliser) => {
  if (!bandeau) {
    bandeau = document.createElement('section');
    bandeau.className = 'consentement';
    bandeau.setAttribute('aria-label', 'Cookies');
    bandeau.innerHTML = `
      <p class="consentement-titre">Acceptez-vous les cookies&nbsp;?</p>
      <p class="consentement-texte">Ils nous permettent de mesurer la fréquentation du site et de comprendre ce qui vous est utile, pour l’améliorer. Pas de publicité, aucune donnée revendue. <a href="/confidentialite.html#cookies">En savoir plus</a></p>
      <div class="consentement-actions">
        <button type="button" data-choix="refuse">Refuser</button>
        <button type="button" data-choix="accepte">Accepter</button>
      </div>`;
    bandeau.addEventListener('click', (e) => {
      const bouton = e.target.closest('[data-choix]');
      if (!bouton) return;
      appliquerChoix(bouton.dataset.choix);
      fermerBandeau();
    });
    document.body.appendChild(bandeau);
  }
  if (focaliser) bandeau.querySelector('button').focus();
};

// Événement envoyé seulement si le visiteur a accepté ; sinon, rien du tout.
export const mesurer = (evenement, parametres = {}) => {
  if (!analyticsCharge || window[DESACTIVATION]) return;
  window.gtag('event', evenement, parametres);
};

document.addEventListener('click', (e) => {
  const lienCookies = e.target.closest('[data-consentement-ouvrir]');
  if (lienCookies) {
    e.preventDefault();
    ouvreur = lienCookies;
    ouvrirBandeau(true);
    return;
  }
  // Un appel est la conversion n° 1 d'une entreprise de peinture : les clics
  // sur le numéro et l'adresse e-mail sont comptés, où qu'ils soient.
  const lien = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
  if (lien) mesurer(lien.protocol === 'tel:' ? 'clic_telephone' : 'clic_email');
});

const choix = lireChoix();
if (choix === 'accepte') chargerAnalytics();
else if (choix === null) {
  // Choix jamais donné, ou expiré après six mois : les cookies d'un ancien
  // accord ne doivent pas survivre à la question qu'on repose.
  couperAnalytics();
  ouvrirBandeau(false);
}
