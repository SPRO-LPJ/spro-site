// SPRO — La carte du pied de page.
//
// Google Maps dépose des cookies et transmet l'adresse IP du visiteur dès que
// l'iframe se charge : la CNIL demande un consentement préalable pour ça. On
// affiche donc d'abord le plan local (image engendrée depuis OpenStreetMap,
// aucune requête sortante), et la vraie carte Google ne se charge qu'au clic —
// le clic valant consentement explicite. Le site reste ainsi sans traceur tant
// que le visiteur n'a rien demandé.

const COORDS = '47.666838,-2.734788';
const EMBED = `https://www.google.com/maps?q=${COORDS}&hl=fr&z=17&output=embed`;

const cadre = document.getElementById('fcarte');
const bouton = document.getElementById('fcarteCharger');

if (cadre && bouton) {
  bouton.addEventListener(
    'click',
    () => {
      const iframe = document.createElement('iframe');
      iframe.src = EMBED;
      iframe.title = 'Plan Google Maps — SPRO, 6 rue Alain Gerbault, ZI du Prat, 56000 Vannes';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      cadre.appendChild(iframe);
      // Masque l'image, le point et le crédit OpenStreetMap : à partir d'ici
      // c'est la carte de Google qui est affichée, pas la nôtre.
      cadre.classList.add('chargee');
    },
    { once: true },
  );
}
