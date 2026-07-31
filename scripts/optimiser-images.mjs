// SPRO — Génère les WebP servis par le site à partir des images d'origine.
//
// Les originaux venaient de la médiathèque WordPress en pleine résolution
// (jusqu'à 2804 px de large pour une carte affichée à 450 px). On les réduit à
// la taille réellement utile, en x2 pour rester net sur les écrans Retina.
//
//   node scripts/optimiser-images.mjs
//
// Les originaux vivent dans masters/img-originaux/ — hors de public/, sinon
// Vite les copierait dans dist/ alors que le site ne sert que les .webp.

import { readdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const SOURCE = 'masters/img-originaux';
const CIBLE = 'public/img';

// Largeur maximale par usage, en pixels physiques (affichage x2).
// Largeurs calées sur l'affichage réel × 2, pour rester net sur écran Retina.
// Une carte fait 579 px de large en 1920 px de fenêtre, sauf la dixième qui
// occupe toute la grille (1766 px) — d'où son traitement à part.
const LARGEURS = {
  'domaines-bg': 2400,   // image pleine largeur de la section Domaines (1800 affichés)
  prive: 1400,           // blocs marché privé / public
  public: 1400,
  default: 1300,         // cartes réalisations (579 affichés)
  'real-10-concession': 2560, // carte bandeau pleine largeur (1766 affichés)
  logo: 700,             // logos partenaires
  histoire: 1400,        // portraits de génération et frise 1982 → 2026
};

const largeurPour = (nom) => {
  if (nom.startsWith('logo-')) return LARGEURS.logo;
  if (nom.startsWith('hist-')) return LARGEURS.histoire;
  return LARGEURS[nom] ?? LARGEURS.default;
};

const ko = (o) => Math.round(o / 1024);

const fichiers = (await readdir(SOURCE)).filter((f) => /\.(png|jpe?g|avif|webp)$/i.test(f));
let avant = 0;
let apres = 0;

for (const fichier of fichiers) {
  const { name } = parse(fichier);
  const source = join(SOURCE, fichier);
  const cible = join(CIBLE, `${name}.webp`);

  const tailleSource = (await stat(source)).size;
  const image = sharp(source);
  const meta = await image.metadata();
  // Pour les orientations EXIF 5 à 8, l'image est pivotée d'un quart de tour :
  // sa largeur réelle est la hauteur déclarée dans le fichier.
  const pivotee = meta.orientation >= 5 && meta.orientation <= 8;
  const largeurReelle = pivotee ? meta.height : meta.width;
  const largeur = Math.min(largeurPour(name), largeurReelle);

  // Les logos ont un fond transparent : sans alpha ils virent au noir.
  const transparent = meta.hasAlpha;

  await image
    // Sans .rotate(), sharp ignore l'orientation EXIF : une photo prise à la
    // verticale ressort couchée (cas de hist-savoir-faire.png, orientation 6).
    .rotate()
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: transparent ? 92 : 86, alphaQuality: 100, effort: 6 })
    .toFile(cible);

  const tailleCible = (await stat(cible)).size;
  avant += tailleSource;
  apres += tailleCible;
  console.log(
    `${fichier.padEnd(26)} ${String(meta.width).padStart(4)}px ${String(ko(tailleSource)).padStart(5)} Ko` +
    `  →  ${name}.webp ${String(largeur).padStart(4)}px ${String(ko(tailleCible)).padStart(5)} Ko`
  );
}

console.log(`\nTotal : ${ko(avant)} Ko → ${ko(apres)} Ko (${Math.round((1 - apres / avant) * 100)} % de moins)`);
