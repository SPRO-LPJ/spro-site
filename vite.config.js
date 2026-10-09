import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Enregistreur de mise au point, serveur de dev uniquement.
//
// Le hero noircit sur un Mac et pas sur un PC. Faire lire les compteurs à
// l'écran par la personne devant la machine est lent et approximatif ; on fait
// donc l'inverse : la page dépose son état ici, et il s'écrit dans `diag.log`,
// que l'on relit tranquillement. Rien de tout cela ne part au build.
const mouchard = () => ({
  name: 'spro-mouchard',
  apply: 'serve',
  configureServer(serveur) {
    serveur.middlewares.use('/__diag', (req, rep, suite) => {
      if (req.method !== 'POST') return suite();
      let corps = '';
      req.on('data', (m) => { corps += m; if (corps.length > 1e6) req.destroy(); });
      req.on('end', () => {
        try { appendFileSync(resolve(__dirname, 'diag.log'), corps.trim() + '\n'); } catch (e) {}
        rep.statusCode = 204;
        rep.end();
      });
    });
  },
});


// Injecte l'entité WebPage, porteuse de la date de dernière modification.
//
// La date vient de `dates-maj.json`, calculé depuis l'historique Git par
// `scripts/dates-maj.mjs`. Elle n'est donc jamais inventée : une page non
// modifiée garde sa date, et une page absente du fichier n'émet aucune date
// plutôt qu'une fausse.
const datesMaj = () => ({
  name: 'spro-dates-maj',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const fichier = ctx.path.replace(/^\//, '');
      const dossier = resolve(__dirname, 'dates-maj.json');
      if (!existsSync(dossier)) return html;
      const date = JSON.parse(readFileSync(dossier, 'utf8'))[fichier];
      if (!date) return html;

      const url = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      const titre = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
      if (!url) return html;

      const bloc = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${url}#page`,
        url,
        ...(titre ? { name: titre } : {}),
        inLanguage: 'fr-FR',
        isPartOf: { '@id': 'https://www.spro.fr/#site' },
        about: { '@id': 'https://www.spro.fr/#entreprise' },
        dateModified: date,
      };
      return html.replace('</head>',
        `<script type="application/ld+json">\n${JSON.stringify(bloc, null, 2)}\n</script>\n</head>`);
    },
  },
});

// Retire les commentaires HTML des pages publiées.
//
// Les sources sont abondamment commentées (choix de mise en page, arbitrages
// SEO, historique des décisions) : ces notes sont utiles à l'équipe, mais
// n'importe quel visiteur les lisait via « Afficher le code source ». Elles
// restent dans les fichiers du dépôt ; seul le HTML servi en est débarrassé.
// Le contenu des balises <script>, <style>, <textarea> et <pre> est laissé
// intact : une séquence « <!-- » peut y avoir un sens.
const BLOCS_INTACTS = /(<(script|style|textarea|pre)\b[^>]*>[\s\S]*?<\/\2>)/gi;
const sansCommentaires = () => ({
  name: 'spro-sans-commentaires',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      return html
        .split(BLOCS_INTACTS)
        .map((morceau, i) => {
          // split() avec deux groupes capturants : 0 = texte, 1 = bloc, 2 = nom de balise.
          if (i % 3 !== 0) return i % 3 === 1 ? morceau : '';
          return morceau
            .replace(/<!--[\s\S]*?-->/g, '')
            // Les lignes vidées par le retrait ne laissent pas de trou.
            .replace(/\n[ \t]*(?=\n)/g, '');
        })
        .join('');
    },
  },
});

// Sans cette liste, `vite build` ne construit que index.html : les pages légales
// seraient absentes du dossier dist/ et les liens du footer tomberaient en 404.
export default defineConfig({
  plugins: [mouchard(), datesMaj(), sansCommentaires()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        mentions: resolve(__dirname, 'mentions-legales.html'),
        confidentialite: resolve(__dirname, 'confidentialite.html'),
        faq: resolve(__dirname, 'faq.html'),
        // Pages de service. L'accueil est un one-page : il ne peut se positionner
        // que sur une intention à la fois, alors que chaque métier a sa propre
        // requête. Ces pages traitent le sujet en profondeur, l'accueil les
        // résume et y renvoie. Sans ces entrées, Vite ne les copie pas au build.
        ravalement: resolve(__dirname, 'ravalement-facade-vannes.html'),
        peintureInterieure: resolve(__dirname, 'peinture-interieure-vannes.html'),
        airless: resolve(__dirname, 'peinture-airless-vannes.html'),
        realisations: resolve(__dirname, 'realisations.html'),
        peintureBureaux: resolve(__dirname, 'peinture-bureaux-vannes.html'),
      },
    },
    // Les vidéos du hero dépassent largement la limite d'inlining, mais on la
    // fixe bas pour éviter que Vite n'embarque des assets en base64 dans le CSS.
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1200,
  },
});
