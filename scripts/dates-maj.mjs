// Dates de dernière modification, dérivées de l'historique Git.
//
// Un `dateModified` posé à la date du jour à chaque déploiement est un faux
// signal : il annonce une mise à jour qui n'a pas eu lieu. Google le dit
// explicitement, et un moteur qui s'en aperçoit cesse d'y croire. On lit donc
// la vraie date du dernier commit ayant touché chaque fichier.
//
// Le calcul se fait ICI, en local, et le résultat est versionné : sur Vercel
// le dépôt est cloné en profondeur 1, `git log` n'y verrait rien.
//
//   node scripts/dates-maj.mjs        à lancer avant de commiter une modif
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [
  'index.html', 'ravalement-facade-vannes.html', 'peinture-interieure-vannes.html',
  'peinture-airless-vannes.html', 'realisations.html', 'faq.html',
  'mentions-legales.html', 'confidentialite.html',
];

const sortie = resolve(racine, 'dates-maj.json');
const connu = existsSync(sortie) ? JSON.parse(readFileSync(sortie, 'utf8')) : {};
const dates = { ...connu };

for (const p of PAGES) {
  let d = '';
  try {
    d = execSync(`git log -1 --format=%cs -- ${JSON.stringify(p)}`, { cwd: racine })
      .toString().trim();
  } catch { /* pas de dépôt, ou fichier jamais commité */ }
  // Une date absente ne doit pas écraser une date connue : mieux vaut la
  // dernière valeur juste qu'un trou.
  if (d) dates[p] = d;
}

writeFileSync(sortie, JSON.stringify(dates, null, 2) + '\n');
for (const [p, d] of Object.entries(dates)) console.log(`  ${d}  ${p}`);

// Le sitemap se sert de la même source. Deux dates qui se contredisent — celle
// du balisage et celle du sitemap — valent moins que pas de date du tout.
const ROUTE = {
  'index.html': '/', 'ravalement-facade-vannes.html': '/ravalement-facade-vannes',
  'peinture-interieure-vannes.html': '/peinture-interieure-vannes',
  'peinture-airless-vannes.html': '/peinture-airless-vannes',
  'realisations.html': '/realisations', 'faq.html': '/faq.html',
  'mentions-legales.html': '/mentions-legales.html',
  'confidentialite.html': '/confidentialite.html',
};
const chemin = resolve(racine, 'public/sitemap.xml');
if (existsSync(chemin)) {
  let xml = readFileSync(chemin, 'utf8');
  for (const [fichier, route] of Object.entries(ROUTE)) {
    const d = dates[fichier];
    if (!d) continue;
    const url = `https://www.spro.fr${route}`;
    xml = xml.replace(
      new RegExp(`(<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>\\s*<lastmod>)[^<]+`),
      `$1${d}`);
  }
  writeFileSync(chemin, xml);
  console.log('\n  sitemap.xml aligné sur ces mêmes dates');
}
