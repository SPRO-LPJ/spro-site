// Avis Google en direct via Places API (New).
// Repli automatique sur les cartes statiques du HTML si pas de clé ou en cas d'erreur.
const PLACE_ID = 'ChIJOcHhNW8eEEgRiVJNhR0N4x8'; // SPRO – Les Peintures de Jules, Vannes
const KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY;

const escapeHtml = (s = '') => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fullStars = (n = 5) => '★★★★★'.slice(0, Math.max(1, Math.min(5, Math.round(n))));

async function loadGoogleReviews() {
  if (!KEY) return; // pas de clé → on conserve les avis statiques de secours
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=fr`, {
      headers: {
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews.rating,reviews.text,reviews.originalText,reviews.authorAttribution,reviews.publishTime,reviews.relativePublishTimeDescription,googleMapsUri',
      },
    });
    if (!res.ok) throw new Error('Places API ' + res.status);
    const data = await res.json();
    render(data);
  } catch (e) {
    console.warn('[Avis Google] repli sur les avis statiques —', e.message);
  }
}

// Nombre d'avis affichés dans la grille. Trois : au-delà on n'ajoute pas de
// conviction, on ajoute de la hauteur — le reste est à un clic sur la fiche.
export const AFFICHES = 3;
// Un avis convainc quand il nomme une prestation. « Réactif, je recommande »
// pourrait décrire un garagiste ; « ravalement effectué, le résultat est
// super » décrit SPRO. Un premier tri par brièveté sélectionnait justement les
// avis les plus vagues — c'est ce que cette liste corrige.
const PRESTATIONS = /ravalement|peinture|peintre|façade|facade|devis|chantier|tapisser|revêtement|revetement|plafond|enduit/i;
// Au-delà, la carte s'étire et déséquilibre la grille à côté de deux avis brefs.
const LONGUEUR_MAX = 290;

const texteAvis = (r) => r.text?.text || r.originalText?.text || '';

// Rang de préférence : dense ET court d'abord, puis court, puis dense mais
// long, puis le reste. À rang égal, le plus court passe devant.
const rangAvis = (r) => {
  const t = texteAvis(r);
  const dense = PRESTATIONS.test(t);
  const court = t.length <= LONGUEUR_MAX;
  if (dense && court) return 0;
  if (court) return 1;
  if (dense) return 2;
  return 3;
};

export function choisirAvis(avis) {
  return avis
    .filter(r => (r.rating || 5) >= 4)
    .sort((a, b) =>
      (b.rating || 0) - (a.rating || 0) ||
      rangAvis(a) - rangAvis(b) ||
      texteAvis(a).length - texteAvis(b).length)
    .slice(0, AFFICHES);
}

function render(data) {
  // En-tête : note + nombre d'avis
  const scoreNum = document.querySelector('.avis-score .num');
  const meta = document.querySelector('.avis-meta');
  if (typeof data.rating === 'number') {
    if (scoreNum) scoreNum.textContent = data.rating.toFixed(1);
    if (meta && data.userRatingCount) meta.textContent = `Évaluation Google : ${data.rating.toFixed(1)} sur 5, basée sur ${data.userRatingCount} avis`;
  }

  // Lien vers la fiche : l'API renvoie l'URL canonique, plus fiable que celle
  // construite à la main à partir du place ID (qui reste le repli du HTML).
  const lien = document.getElementById('avisLien');
  if (lien && data.googleMapsUri) lien.href = data.googleMapsUri;

  const grid = document.querySelector('.avis-grid');
  const reviews = choisirAvis(Array.isArray(data.reviews) ? data.reviews : []);
  if (grid && reviews.length) {
    grid.innerHTML = reviews.map(r => {
      const name = r.authorAttribution?.displayName || 'Client Google';
      const text = r.text?.text || r.originalText?.text || '';
      const when = r.relativePublishTimeDescription ? ` · ${escapeHtml(r.relativePublishTimeDescription)}` : '';
      return `<article class="avis-card">
        <div class="stars">${fullStars(r.rating)}</div>
        <p class="txt">${escapeHtml(text)}</p>
        <div class="who">${escapeHtml(name)}${when}</div>
      </article>`;
    }).join('');
    // Les nouvelles cartes ne passent pas par l'observer de révélation : on les rend visibles.
    grid.querySelectorAll('.avis-card').forEach(c => { c.style.opacity = 1; c.style.transform = 'none'; });
    // Ré-mesure le bloc défilant (le nombre/largeur des cartes a changé).
    if (typeof window.__avisRefresh === 'function') window.__avisRefresh();
  }
}

loadGoogleReviews();
