// Fabrique le plan de situation du footer, une bonne fois pour toutes.
//
// Le site ne fait aucune requête vers l'extérieur (choix RGPD assumé : polices
// auto-hébergées, aucun script tiers). Embarquer une carte Google ou même un
// iframe OpenStreetMap ferait sortir l'adresse IP de chaque visiteur. On
// télécharge donc les tuiles une seule fois ici, on les assemble, on les
// désature pour qu'elles tiennent dans la direction artistique du site, et on
// sert une simple image. Le point rouge et le lien vers le plan interactif sont
// posés par-dessus en HTML.
//
// Usage : node scripts/carte-statique.mjs
// Attribution obligatoire (ODbL) : « © OpenStreetMap », affichée sur la carte.

import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

// SPRO — 6 rue Alain Gerbault, ZI du Prat, 56000 Vannes (relevé Nominatim).
const LAT = 47.666838;
const LON = -2.734788;
const ZOOM = 17;
const LARGEUR = 1520; // 2× pour les écrans Retina : affiché à 760 px
const HAUTEUR = 840;
const SORTIE = resolve(process.cwd(), 'public/img/carte-spro.webp');
const TUILE = 256;

// Projection Web Mercator : de degrés vers coordonnées de tuile fractionnaires.
const versTuile = (lat, lon, z) => {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
};

const centre = versTuile(LAT, LON, ZOOM);
const pxCentre = { x: centre.x * TUILE, y: centre.y * TUILE };
const gauche = pxCentre.x - LARGEUR / 2;
const haut = pxCentre.y - HAUTEUR / 2;

const tx0 = Math.floor(gauche / TUILE);
const ty0 = Math.floor(haut / TUILE);
const tx1 = Math.floor((gauche + LARGEUR) / TUILE);
const ty1 = Math.floor((haut + HAUTEUR) / TUILE);

const recupere = async (x, y) => {
  const url = `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`;
  const r = await fetch(url, {
    // La politique d'usage d'OpenStreetMap impose un User-Agent identifiable.
    headers: { 'User-Agent': 'spro.fr-site-build/1.0 (contact@spro.fr)' },
  });
  if (!r.ok) throw new Error(`tuile ${x}/${y} : HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};

const tuiles = [];
for (let x = tx0; x <= tx1; x++) {
  for (let y = ty0; y <= ty1; y++) {
    tuiles.push({ x, y, data: await recupere(x, y) });
    console.log(`tuile ${x}/${y} récupérée`);
  }
}

const composite = tuiles.map((t) => ({
  input: t.data,
  left: Math.round(t.x * TUILE - gauche),
  top: Math.round(t.y * TUILE - haut),
}));

await mkdir(dirname(SORTIE), { recursive: true });

// Deux passes : sharp applique `composite` APRÈS les opérations d'image, donc
// désaturer la même pipeline ne toucherait que le fond, pas les tuiles collées
// dessus. On assemble d'abord en mémoire, on retraite ensuite.
const assemblee = await sharp({
  create: { width: LARGEUR, height: HAUTEUR, channels: 3, background: '#0e1114' },
})
  .composite(composite)
  .png()
  .toBuffer();

// Désaturée et assombrie : la carte doit se lire comme un fond sombre cohérent
// avec le pied de page, pas comme une capture d'écran collée dedans.
// La plage [0-255] des tuiles est ramenée dans [10-85] : on garde la lisibilité
// des rues et des noms, mais dans les valeurs sombres du site. Un simple
// assombrissement écraserait les traits fins en noir.
await sharp(assemblee)
  .greyscale()
  .linear(0.3, 10)
  .webp({ quality: 82 })
  .toFile(SORTIE);

const { size } = await stat(SORTIE);
console.log(`\n${SORTIE}`);
console.log(`${LARGEUR}×${HAUTEUR} — ${(size / 1024).toFixed(0)} Ko`);
console.log(`centre : ${LAT}, ${LON} (zoom ${ZOOM})`);
