// Fabrique la carte « zone d'intervention » de la page ravalement.
//
// Fond : la carte OpenStreetMap standard, telle quelle (« une carte normale »,
// demande du user), assemblée ici une fois et servie comme une image — aucune
// requête externe pour le visiteur. Attribution (ODbL) affichée sur la carte.
//
// Deux zones, deux tracés : le ravalement de maisons de particuliers (communes
// entières dont le centre est à 35 km ou moins du siège, plus Ploërmel et
// Quiberon) et le reste de l'activité (communes du Morbihan dont le centre est
// à 50 km ou moins). Le fond est au zoom 10 pour que les 50 km tiennent dans
// le cadre. Contours officiels
// des communes : geo.api.gouv.fr (IGN, Licence Ouverte), téléchargés ici.
// La limite tracée en tirets ne suit que la terre ferme : on ne garde que les
// segments partagés entre une commune de la zone et une commune hors zone ;
// la côte n'est donc jamais soulignée.
//
// Le script affiche les deux tracés dans le repère du SVG de la page (viewBox
// 1600 × 2000, l'image de 1200 × 1500 y est agrandie), à recopier dans la page.
//
// Usage : node scripts/carte-zone-ravalement.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';

const SPRO = { lat: 47.666838, lon: -2.734788 };
const RAYON_KM = 35;
const RAYON_GENERAL_KM = 50;
// Communes ajoutées en entier au-delà du rayon : Ploërmel (chantiers) et
// Quiberon (centre à 35,3 km, toute la presqu'île est desservie).
const EN_PLUS = ['Ploërmel', 'Quiberon'];
// Belle-Île : une partie de l'île tombe sous les 50 km, l'autre non ; un
// tracé couperait l'île en deux. On la laisse hors zone.
const EXCLUS = ['Le Palais', 'Bangor', 'Sauzon', 'Locmaria'];
const ZOOM = 10;
const LARGEUR = 1200;
const HAUTEUR = 1500;
// Décalage vers le nord : les deux zones au centre du cadre, moins de mer.
const DECALAGE_Y = -138;
// Repère du SVG de la page : 1600 × 2000, soit l'image agrandie de 4/3.
const ECHELLE_SVG = 1600 / LARGEUR;
const SORTIE = resolve(process.cwd(), 'public/img/carte-zone-osm.webp');
const CACHE = join(tmpdir(), 'spro-tuiles-osm');
const TUILE = 256;

const versPixel = (lat, lon) => {
  const n = 2 ** ZOOM * TUILE;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  };
};
const centre = versPixel(SPRO.lat, SPRO.lon);
const gauche = centre.x - LARGEUR / 2;
const haut = centre.y - HAUTEUR / 2 + DECALAGE_Y;
const local = (lat, lon) => {
  const p = versPixel(lat, lon);
  return [p.x - gauche, p.y - haut];
};
const distanceKm = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

// ---- Fond OSM ------------------------------------------------------------
const recupere = async (x, y) => {
  const fichier = join(CACHE, `${ZOOM}-${x}-${y}.png`);
  try {
    return await readFile(fichier);
  } catch {}
  const r = await fetch(`https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`, {
    // La politique d'usage d'OpenStreetMap impose un User-Agent identifiable.
    headers: { 'User-Agent': 'spro.fr-site-build/1.0 (contact@spro.fr)' },
  });
  if (!r.ok) throw new Error(`tuile ${x}/${y} : HTTP ${r.status}`);
  const data = Buffer.from(await r.arrayBuffer());
  await mkdir(CACHE, { recursive: true });
  await writeFile(fichier, data);
  return data;
};
const MARGE = TUILE;
const composites = [];
for (let x = Math.floor(gauche / TUILE); x <= Math.floor((gauche + LARGEUR) / TUILE); x++) {
  for (let y = Math.floor(haut / TUILE); y <= Math.floor((haut + HAUTEUR) / TUILE); y++) {
    composites.push({ input: await recupere(x, y), left: Math.round(x * TUILE - gauche) + MARGE, top: Math.round(y * TUILE - haut) + MARGE });
  }
}
// Deux passes : dans une même chaîne sharp, extract() s'applique AVANT composite().
const assemblage = await sharp({ create: { width: LARGEUR + 2 * MARGE, height: HAUTEUR + 2 * MARGE, channels: 3, background: '#f2efe9' } })
  .composite(composites).png().toBuffer();
await mkdir(dirname(SORTIE), { recursive: true });
const fond = await sharp(assemblage)
  .extract({ left: MARGE, top: MARGE, width: LARGEUR, height: HAUTEUR })
  // Qualité haute : les noms de villes de la carte restent nets.
  .webp({ quality: 92, smartSubsample: true })
  .toFile(SORTIE);
// Version 800 px pour les téléphones (srcset de la page).
await sharp(SORTIE).resize(800, null, { kernel: 'lanczos3' }).sharpen(0.6).webp({ quality: 90, smartSubsample: true }).toFile(SORTIE.replace('.webp', '-800.webp'));

// ---- Communes ------------------------------------------------------------
// Morbihan, plus les départements voisins : leurs communes ne sont jamais
// dans la zone, mais il les faut pour tracer la limite le long de la Vilaine
// et des frontières départementales.
const features = [];
for (const dep of ['56', '44', '35', '22', '29']) {
  const r = await fetch(`https://geo.api.gouv.fr/departements/${dep}/communes?fields=nom,code&format=geojson&geometry=contour`);
  if (!r.ok) throw new Error(`geo.api.gouv.fr ${dep} : HTTP ${r.status}`);
  const { features: f } = await r.json();
  features.push(...f.map((x) => ({ ...x, properties: { ...x.properties, dep } })));
}
const anneaux = (g) => (g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]));
const centroide = (anneau) => {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < anneau.length - 1; i++) {
    const [x0, y0] = anneau[i], [x1, y1] = anneau[i + 1];
    const k = x0 * y1 - x1 * y0;
    a += k; x += (x0 + x1) * k; y += (y0 + y1) * k;
  }
  return { lon: x / (3 * a), lat: y / (3 * a) };
};
const communes = features.map((f) => {
  const principal = anneaux(f.geometry).sort((a, b) => b.length - a.length)[0];
  const c = centroide(principal);
  return { nom: f.properties.code, libelle: f.properties.nom, dep: f.properties.dep, anneaux: anneaux(f.geometry), km: distanceKm(SPRO, c) };
});
const tracer = (dansZone) => {

// Segments : clé = extrémités arrondies, sans sens. Un segment de la zone
// partagé avec une commune hors zone = limite terrestre.
const cle = (p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
const proprietaires = new Map();
for (const c of communes) {
  for (const a of c.anneaux) {
    for (let i = 0; i < a.length - 1; i++) {
      const k1 = cle(a[i]), k2 = cle(a[i + 1]);
      const k = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      if (!proprietaires.has(k)) proprietaires.set(k, { a: a[i], b: a[i + 1], communes: new Set() });
      proprietaires.get(k).communes.add(c.nom);
    }
  }
}
const limite = [...proprietaires.values()].filter(({ communes: cs }) => {
  const liste = [...cs];
  return liste.some((n) => dansZone.has(n)) && liste.some((n) => !dansZone.has(n));
});

// Chaînage des segments en polylignes.
const suivants = new Map();
for (const s of limite) {
  for (const [p, q] of [[s.a, s.b], [s.b, s.a]]) {
    const k = cle(p);
    if (!suivants.has(k)) suivants.set(k, []);
    suivants.get(k).push({ s, vers: q });
  }
}
const vus = new Set();
const lignes = [];
for (const s of limite) {
  if (vus.has(s)) continue;
  vus.add(s);
  const ligne = [s.a, s.b];
  for (const sens of [1, -1]) {
    for (;;) {
      const bout = sens === 1 ? ligne.at(-1) : ligne[0];
      const suite = (suivants.get(cle(bout)) || []).find((o) => !vus.has(o.s));
      if (!suite) break;
      vus.add(suite.s);
      if (sens === 1) ligne.push(suite.vers); else ligne.unshift(suite.vers);
    }
  }
  lignes.push(ligne);
}
// Simplification (Douglas-Peucker, tolérance d'un pixel) : le contour IGN a
// bien plus de détail que l'image n'en montre.
const simplifier = (pts, tol) => {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / l;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return simplifier(pts.slice(0, idx + 1), tol).slice(0, -1).concat(simplifier(pts.slice(idx), tol));
};
const chemin = lignes
  .map((l) => simplifier(l.map(([lon, lat]) => local(lat, lon).map((v) => v * ECHELLE_SVG)), 1))
  .map((l) => 'M' + l.map((p) => p.map((v) => Math.round(v)).join(',')).join('L'))
  .join('');

console.error(`${dansZone.size} communes · ${limite.length} segments, ${lignes.length} lignes · ${chemin.length} caractères`);
return chemin;
};

const zoneMaisons = new Set(communes.filter((c) => c.dep === '56' && (c.km <= RAYON_KM || EN_PLUS.includes(c.libelle))).map((c) => c.nom));
const zoneGenerale = new Set(communes.filter((c) => c.dep === '56' && !EXCLUS.includes(c.libelle) && (c.km <= RAYON_GENERAL_KM || zoneMaisons.has(c.nom))).map((c) => c.nom));
console.error(`fond ${Math.round(fond.size / 1024)} Ko`);
const siege = local(SPRO.lat, SPRO.lon).map((v) => Math.round(v * ECHELLE_SVG));
console.log(JSON.stringify({ siege, maisons: tracer(zoneMaisons), general: tracer(zoneGenerale) }));
