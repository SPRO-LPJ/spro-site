// SPRO — Réponse 410 Gone pour les URL de l'ancien site PHP.
//
// Pourquoi une fonction plutôt qu'une règle de configuration : les `redirects`
// de vercel.json ne savent émettre que des 3xx, et la propriété `routes`, qui
// accepterait un `status`, est exclusive de `redirects` / `rewrites` /
// `headers` — l'adopter imposerait de réécrire toute la configuration. Une
// réécriture vers cette fonction est la seule voie qui coexiste avec
// l'existant.
//
// Pourquoi 410 plutôt que 404 : le 404 dit « je ne trouve pas », et un moteur
// repasse régulièrement vérifier. Le 410 dit « cette page a été supprimée,
// définitivement » — Google la retire de son index plus vite et cesse de la
// recracher. C'est le traitement juste pour les ~72 URL de l'ancien site en
// PHP qui n'ont aucun équivalent sur le nouveau.
//
// Les URL qui, elles, ont un équivalent sont interceptées AVANT d'arriver ici :
// les `redirects` sont évalués avant les `rewrites`. Pour épargner une adresse
// à l'avenir, il suffit donc d'ajouter sa règle de redirection dans
// vercel.json — elle passera devant.

export default function handler(request, response) {
  // Une page supprimée ne se met pas en cache : si on redonne un jour un sens
  // à cette adresse, un cache long la laisserait morte pour des mois.
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('X-Robots-Tag', 'noindex');

  // Un humain peut atterrir ici depuis un vieux signet ou un lien externe : on
  // lui dit ce qui s'est passé et on lui rend la main, plutôt que de le laisser
  // sur une page blanche.
  response.status(410).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Page supprimée — SPRO</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: #f3f1ec; color: #0e1114;
    font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 32px;
  }
  main { max-width: 34rem; }
  h1 { font-size: 1.6rem; line-height: 1.2; margin: 0 0 14px; letter-spacing: -.01em; }
  p { margin: 0 0 14px; color: #4d5359; }
  a { color: #004D95; }
  .liens { margin-top: 26px; padding-top: 20px; border-top: 1px solid rgba(14,17,20,.13); }
  .liens a { display: inline-block; margin-right: 18px; font-weight: 600; text-decoration: none; }
  .liens a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main>
    <h1>Cette page n'existe plus</h1>
    <p>Elle appartenait à l'ancienne version du site SPRO et n'a pas d'équivalent aujourd'hui.</p>
    <p>Vous trouverez ci-dessous les pages qui traitent nos métiers.</p>
    <nav class="liens">
      <a href="/">Accueil</a>
      <a href="/ravalement-facade-vannes">Ravalement de façade</a>
      <a href="/peinture-interieure-vannes">Peinture intérieure</a>
      <a href="/realisations">Réalisations</a>
      <a href="/#contact">Demander un devis</a>
    </nav>
  </main>
</body>
</html>`);
}
