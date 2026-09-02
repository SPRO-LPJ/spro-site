# Mise en ligne de spro.fr

État au 22/07/2026. Le site est un statique construit par Vite : `npx vite build`
produit `dist/`, qu'il suffit de déposer chez n'importe quel hébergeur.

## Avant de publier — les trois choses à décider

### 1. Où partent les demandes du formulaire

Destination visée : **contact@spro.fr**.

Sans endpoint, le formulaire **refuse d'afficher « Merci »** et renvoie vers le
téléphone et l'e-mail. C'est volontaire : une demande de devis perdue en silence
coûte plus cher qu'un message d'erreur.

**Le plus simple — Web3Forms**, sans compte ni mot de passe :

1. Aller sur [web3forms.com](https://web3forms.com) et saisir `contact@spro.fr`
   dans le champ « Create Access Key ».
2. La clé arrive par mail (une suite de type `a1b2c3d4-…`). Il faut cliquer le
   lien de confirmation du mail, sinon la clé reste inactive.
3. Renseigner les deux lignes dans `.env` :

   ```bash
   VITE_CONTACT_ENDPOINT=https://api.web3forms.com/submit
   VITE_CONTACT_KEY=la-clé-reçue
   ```

4. Relancer le serveur : **Vite ne lit `.env` qu'au démarrage**, une
   modification à chaud n'est pas prise en compte.
5. Reconstruire pour la production (`vite build`), et sur l'hébergeur, déclarer
   les deux mêmes variables dans son panneau — la construction s'y refait, elle
   ne récupère pas le `.env` local.

Formspree convient aussi (compte requis) : l'URL `https://formspree.io/f/xxxxxxxx`
dans `VITE_CONTACT_ENDPOINT`, et `VITE_CONTACT_KEY` laissée vide.

Le corps envoyé est :

```json
{ "nom": "…", "tel": "…", "email": "…", "message": "…",
  "subject": "Demande de devis — <nom>", "from_name": "Site spro.fr",
  "origine": "spro.fr — formulaire accueil", "access_key": "<si renseignée>" }
```

Le service doit répondre `200` **et** autoriser le domaine spro.fr en CORS.
Testé de bout en bout : succès → « Merci » + champs vidés ; échec ou panne
réseau → message rouge, bouton réactivé, saisie conservée.

⚠️ La clé se retrouve dans le JavaScript livré, donc visible par n'importe qui.
C'est le fonctionnement prévu par Web3Forms : elle ne donne accès à rien, elle
ne fait que désigner la boîte de destination. Le seul risque est le spam, déjà
limité par le champ-piège du formulaire et le filtrage du service.

### 2. Où sont hébergées les vidéos du hero

`dist/` pèse **243 Mo, dont 240 Mo de vidéo**. C'est le point sensible :

| Hébergeur | Limite par fichier | Verdict pour `hero-1080.mp4` (149 Mo) |
|---|---|---|
| Cloudflare Pages | 25 Mo | **refusé** |
| Vercel | ~100 Mo | **refusé** |
| Netlify | pas de limite dure | passe, mais la bande passante est facturée |
| Stockage objet + CDN (Bunny, Cloudflare R2, S3) | — | **la bonne réponse** |

Poser les deux `.mp4` sur un CDN, puis renseigner `VITE_MEDIA_BASE` dans `.env` :

```
VITE_MEDIA_BASE=https://spro.b-cdn.net
```

Le build réécrit alors les sources en absolu et `dist/` retombe à ~3 Mo.
Vérifié dans les deux sens (vide → `/media/…`, renseigné → URL absolue).

Le CDN **doit** répondre aux requêtes `Range` (code 206) : sans ça le scrub
télécharge tout le fichier avant de démarrer. Test :

```bash
curl -s -r 0-1023 -o /dev/null -w '%{http_code}\n' https://VOTRE-CDN/media/hero-1080.mp4
```

Compter la bande passante : ~149 Mo par visiteur desktop qui déroule le hero en
entier. 1 000 visiteurs ≈ 150 Go/mois.

### 3. Le nom de l'hébergeur dans les mentions légales

~~`mentions-legales.html` annonce **IONOS**~~ — **corrigé le 2026-09-02** :
la page déclare désormais Vercel Inc., l'hébergeur réel depuis le 2026-07-31.
À refaire si le site change encore d'hébergeur : c'est une obligation légale
(LCEN, article 6-III), pas un détail.

## Les commandes

```bash
npm install
node scripts/optimiser-images.mjs   # seulement si les images d'origine changent
npx vite build
npx vite preview --port 4180        # contrôle du build avant envoi
```

## Ce qui a été réglé

- **Polices auto-hébergées.** Google Fonts en CDN transmettait l'IP des visiteurs
  à Google, ce que la CNIL sanctionne. Les 14 `.woff2` (552 Ko) sont servis depuis
  le site. Vérifié : **zéro requête externe** au chargement de la page.
- **GSAP et Lenis embarqués.** Ils venaient de cdnjs et unpkg : un CDN indisponible
  ou bloqué et le hero comme le scroll fluide cassaient. Ils sont maintenant dans
  le bundle (135 Ko, 51 Ko gzippés).
- **Images.** 6,8 Mo → 958 Ko en WebP (‑86 %), redimensionnées à la taille
  réellement affichée. Les originaux sont conservés dans `masters/img-originaux/`.
- **Vidéo.** 436 Mo → 149 Mo en desktop, sans perte visible (CRF 20, keyframe
  toutes les 0,5 s pour garder le scrub réactif). Le mobile reçoit un 720p de
  65 Mo via `<source media>`. Les masters restent dans `masters/`.
- **Pages légales.** `mentions-legales.html` et `confidentialite.html`, reprises
  mot pour mot de spro.fr, liées depuis le pied de page et déclarées dans le build
  multi-pages (`vite.config.js`) — sans ça elles auraient été absentes de `dist/`.
- **Référencement et partage.** `canonical`, Open Graph + Twitter Card avec une
  image 1200×630, `robots.txt`, `sitemap.xml`, et un bloc JSON-LD `HousePainter`
  avec l'adresse, le téléphone et la note 4,9/71 avis.
- **Formulaire.** Il affichait « Merci » sans rien envoyer. Il envoie pour de vrai,
  avec piège à robots et mention RGPD.

## Les redirections de l'ancien site (`vercel.json`)

L'ancien spro.fr était en PHP et ses URL sont toujours indexées par Google. Sur
Vercel elles renvoyaient 403 : la protection automatique de la plateforme bloque
l'extension `.php` sur n'importe quel chemin (`.aspx` ou `.php5` passent, eux, en
404 normal). Les `redirects` de `vercel.json` sont évalués **avant** cette
protection — c'est ce qui rend la récupération possible sans toucher au pare-feu.

Le JSON n'accepte pas de commentaires, d'où la carte ici. Les règles vont du plus
précis au plus général ; Vercel s'arrête à la première correspondance.

| Ancienne URL | Redirigée vers |
| --- | --- |
| `/vente-peinture-vannes/*`, `/magasin-peinture-vannes/*`, `/catalogue-page1.php` | `/#boutique` |
| `/renovation-deco-vannes/*`, `/peintre-chantier-{pro,particulier}.php` | `/#domaines` |
| `/peintre-decorateur-morbihan/*`, `/galerie_photo.php`, `/actualites.php` | `/#realisations` |
| `/travaux-peinture-morbihan/*`, `/devis-peinture-revetement.php`, `/merci.php` | `/#contact` |
| `…/conseils-suivis-chantiers.php` | `/#methode` |
| `…/recrutement-peintre-batiment.php` | `/#histoire` |
| `/entreprise-peinture-vannes/*` (reste) | `/#expertise` |
| `…/mentions-legales.php` | `/mentions-legales.html` |
| `/administration/*`, `/public/*`, captchas | `/` |
| tout autre `*.php` | `/` (filet de sécurité) |

Toute modification doit être validée par `vercel build --yes` avant d'être poussée :
une erreur de schéma dans `vercel.json` fait échouer le déploiement entier.

⚠️ Cette table décrit l'intention d'origine et a divergé de `vercel.json` quand les
pages de métier ont été créées le 01/09 : plusieurs cibles `/#ancre` ont été
remplacées par les nouvelles pages, et `/entreprise-peinture-vannes/*` a perdu la
sienne au passage. La source de vérité est `vercel.json`.

## Le cache HTTP (`vercel.json`, section `headers`)

Sans règle explicite, Vercel sert **tout** en `max-age=0, must-revalidate` — mesuré
le 02/09 sur la production : la vidéo de 73 Mo, les 218 images, les polices et
jusqu'aux bundles JS dont le nom porte déjà une empreinte de contenu. Chaque visite
revalidait l'intégralité du site.

| Chemin | Durée | Pourquoi |
| --- | --- | --- |
| `/assets/*`, `/fonts/*` | 1 an, `immutable` | Noms versionnés par Vite ou fichiers figés : un changement produit un nouveau nom, le cache ne peut pas servir de version périmée. |
| `/media/*`, `/img/*`, `/brand/*` | 30 jours + `stale-while-revalidate` | Noms **stables** : on ne peut pas les figer un an sans risquer qu'un média remplacé reste invisible. Pour forcer une mise à jour immédiate, ajouter `?v=N` à l'appel — c'est déjà ce qui a été fait sur `domaines-bg.webp`. |
| `/sitemap.xml`, `/robots.txt` | aucune | Doivent être relus à chaque passage des robots. |

Les pages HTML gardent volontairement le défaut sans cache : leur contenu change, et
elles sont légères.

## Ce qui reste ouvert
- **Les avis Google.** `VITE_GOOGLE_PLACES_KEY` est vide : le site affiche les
  7 témoignages statiques. C'est un repli volontaire, pas une panne.
- **Bandeau cookies.** La politique de confidentialité en mentionne un. Tant
  qu'aucun outil de mesure d'audience n'est branché, aucun cookie n'est déposé et
  le bandeau n'est pas nécessaire — mais il le deviendra le jour où une analytics
  arrive.
- **Le 404.** Aucune page d'erreur personnalisée ; l'hébergeur affichera la sienne.
