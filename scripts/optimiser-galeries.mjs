// SPRO — Prépare les photos des fiches de réalisation affichées en visionneuse.
//
//   node scripts/optimiser-galeries.mjs
//
// Les originaux viennent de la médiathèque WordPress et pèsent 84 Mo à eux
// seuls. Ils restent dans masters/galeries/ ; seuls les .webp générés dans
// public/img/galeries/ sont servis. Ils sont plus grands que les vignettes des
// cartes (1600 px) puisqu'ils s'affichent en plein écran.

import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const SOURCE = 'masters/galeries';
const CIBLE = 'public/img/galeries';
const LARGEUR = 2200;

await mkdir(CIBLE, { recursive: true });

// L'ordre d'affichage en visionneuse est l'ordre ALPHABÉTIQUE des noms de
// fichiers. Pour insérer une photo entre deux numéros existants sans renuméroter
// toute la série, on ajoute un chiffre : `ravalement-095` se range entre
// `ravalement-09` et `ravalement-10`. Le secteur reste correctement détecté,
// la règle ci-dessous ne retirant que les chiffres de fin.
const fichiers = (await readdir(SOURCE)).filter((f) => /\.(png|jpe?g|avif|webp)$/i.test(f)).sort();
const parSecteur = {};
let avant = 0;
let apres = 0;

for (const fichier of fichiers) {
  const { name } = parse(fichier);
  const secteur = name.replace(/-\d+$/, '');
  const cible = join(CIBLE, `${name}.webp`);

  const tailleSource = (await stat(join(SOURCE, fichier))).size;
  const image = sharp(join(SOURCE, fichier));
  const meta = await image.metadata();
  // Orientation EXIF 5 à 8 : l'image est pivotée, sa largeur réelle est sa hauteur.
  const pivotee = meta.orientation >= 5 && meta.orientation <= 8;
  const largeur = Math.min(LARGEUR, pivotee ? meta.height : meta.width);

  await image
    .rotate()
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: 84, effort: 6 })
    .toFile(cible);

  const tailleCible = (await stat(cible)).size;
  avant += tailleSource;
  apres += tailleCible;

  (parSecteur[secteur] ??= []).push(`/img/galeries/${name}.webp`);
}

await writeFile(join(CIBLE, 'index.json'), JSON.stringify(parSecteur, null, 1));

const ko = (o) => Math.round(o / 1024);
for (const [secteur, liste] of Object.entries(parSecteur)) {
  console.log(`${secteur.padEnd(18)} ${String(liste.length).padStart(2)} photos`);
}
console.log(`\nTotal : ${ko(avant)} Ko → ${ko(apres)} Ko (${Math.round((1 - apres / avant) * 100)} % de moins)`);
