// SPRO — Fabrique les variantes réduites référencées par les `srcset` des pages.
//
//   node scripts/images-responsives.mjs
//
// Sur mobile, le navigateur téléchargeait les photos en taille ordinateur :
// jusqu'à 2200 px de large (830 Ko) pour une vignette affichée sur 200 px.
// Les pages proposent donc, via `srcset`/`sizes`, des copies plus étroites ;
// le navigateur prend la plus petite qui reste nette à la densité de l'écran.
//
// C'est le HTML qui fait foi : ce script lit les `srcset` des pages listées
// plus bas et produit exactement les fichiers qu'ils citent, ni plus ni moins.
// Pour ajouter une taille à une image, on l'ajoute à son `srcset`, puis on
// relance le script. Les variantes déjà à jour (plus récentes que leur source)
// sont sautées.
//
// Nommage :
//   /img/tailles/<chemin>-<largeur>.webp  ← public/img/<chemin>.(webp|jpg|png)
//                                           ou public/<chemin>.(…) pour media/
//   /brand/<logo>.webp, /brand/<logo>-<largeur>.webp ← public/brand/<logo>.png
//
// Règles, dans l'ordre d'importance :
// - L'original n'est JAMAIS modifié ni remplacé : il reste la plus grande
//   entrée du `srcset` et le `src` de repli. Un grand écran Retina reçoit donc
//   exactement l'image d'avant.
// - Aucune variante n'est agrandie : demander une largeur supérieure à
//   l'original est une erreur.
// - Photos : WebP qualité 92 (au-dessus des 84-86 des originaux, eux-mêmes en
//   WebP). Logos : WebP SANS PERTE et `exact` (même les pixels transparents
//   gardent leur couleur) : en pleine taille, identique au PNG octet pour
//   octet une fois décodé (RGBA).
// - Les `sizes` des pages ont été calés sur la largeur réellement affichée,
//   mesurée de 320 à 1920 px de fenêtre (object-fit:cover compris), +5 % de
//   marge. Si une mise en page change, ils sont à revoir.
// - `.rotate()` applique l'orientation EXIF : sans lui, une photo prise à la
//   verticale ressortirait couchée (sips l'ignore, sharp aussi par défaut).

import { readFile, stat, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const PAGES = ['index.html', 'realisations.html'];
const EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'];

const ko = (o) => Math.round(o / 1024);
const existe = (f) => access(f).then(() => true, () => false);

// Toutes les URL de variantes citées dans les srcset des pages.
async function variantesCitees() {
  const urls = new Set();
  for (const page of PAGES) {
    const html = await readFile(page, 'utf8');
    for (const [, srcset] of html.matchAll(/\ssrcset="([^"]+)"/g)) {
      for (const entree of srcset.split(',')) {
        const url = entree.trim().split(/\s+/)[0];
        if (url.startsWith('/img/tailles/') || /^\/brand\/[^/]+\.webp$/.test(url)) urls.add(url);
      }
    }
  }
  return [...urls].sort();
}

// Retrouve l'original d'une variante, et la largeur demandée (null = pleine).
async function decoder(url) {
  const logo = url.startsWith('/brand/');
  const m = url.match(/^\/(?:img\/tailles\/)?(.+?)(?:-(\d+))?\.webp$/);
  if (!m) throw new Error(`Nom de variante non reconnu : ${url}`);
  const [, chemin, largeur] = m;
  const bases = logo ? [join('public', chemin)] : [join('public/img', chemin), join('public', chemin)];
  for (const base of bases) {
    for (const ext of EXTENSIONS) {
      const source = `${base}.${ext}`;
      if (source === join('public', url)) continue; // la variante elle-même
      if (await existe(source)) {
        return { source, cible: join('public', url), largeur: largeur ? Number(largeur) : null, logo };
      }
    }
  }
  throw new Error(`Original introuvable pour ${url}`);
}

async function aJour(source, cible) {
  try {
    return (await stat(cible)).mtimeMs >= (await stat(source)).mtimeMs;
  } catch {
    return false;
  }
}

async function produire({ source, cible, largeur, logo }) {
  const meta = await sharp(source).metadata();
  // Orientation EXIF 5 à 8 : l'image est pivotée, sa largeur réelle est sa hauteur.
  const pivotee = meta.orientation >= 5 && meta.orientation <= 8;
  const largeurReelle = pivotee ? meta.height : meta.width;
  if (largeur && largeur >= largeurReelle) {
    throw new Error(`${cible} : ${largeur} px demandés, l'original n'en fait que ${largeurReelle}`);
  }

  await mkdir(dirname(cible), { recursive: true });
  const image = sharp(source).rotate();
  if (largeur) image.resize({ width: largeur });
  await image
    .webp(logo
      ? { lossless: true, exact: true, effort: 6 }
      : { quality: 92, smartSubsample: true, effort: 6 })
    .toFile(cible);
}

let total = 0;
let refaites = 0;
const urls = await variantesCitees();

for (const url of urls) {
  const tache = await decoder(url);
  if (!(await aJour(tache.source, tache.cible))) {
    await produire(tache);
    refaites += 1;
  }
  const poids = (await stat(tache.cible)).size;
  total += poids;
  console.log(`${url.padEnd(56)} ${String(ko(poids)).padStart(5)} Ko`);
}

console.log(`\n${urls.length} variantes citées (${refaites} régénérées), ${ko(total)} Ko au total.`);
