import { appendFileSync } from 'node:fs';
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

// Sans cette liste, `vite build` ne construit que index.html : les pages légales
// seraient absentes du dossier dist/ et les liens du footer tomberaient en 404.
export default defineConfig({
  plugins: [mouchard()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        mentions: resolve(__dirname, 'mentions-legales.html'),
        confidentialite: resolve(__dirname, 'confidentialite.html'),
        faq: resolve(__dirname, 'faq.html'),
        // Pages de service. Elles existent pour le référencement : l'accueil
        // étant un one-page, il ne pouvait se positionner que sur une requête
        // à la fois. Chaque métier a désormais son URL, et les anciennes URL
        // du site PHP y sont redirigées (voir vercel.json).
        ravalement: resolve(__dirname, 'ravalement-facade-vannes.html'),
        peintureInterieure: resolve(__dirname, 'peinture-interieure-vannes.html'),
        airless: resolve(__dirname, 'peinture-airless.html'),
        ventePeinture: resolve(__dirname, 'vente-peinture-vannes.html'),
      },
    },
    // Les vidéos du hero dépassent largement la limite d'inlining, mais on la
    // fixe bas pour éviter que Vite n'embarque des assets en base64 dans le CSS.
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1200,
  },
});
