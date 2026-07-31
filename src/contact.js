// SPRO — Formulaire de contact.
//
// Règle de base : ne jamais afficher « Merci » sans avoir la confirmation que la
// demande est bien partie. Une demande de devis perdue en silence, c'est un
// client perdu — et personne ne s'en rend compte avant des semaines.
//
// Les demandes arrivent sur contact@spro.fr. Deux réglages dans .env :
//   VITE_CONTACT_ENDPOINT — l'URL qui reçoit le POST JSON
//   VITE_CONTACT_KEY      — la clé du service, si le sien en attend une
//                           (Web3Forms l'exige dans le corps, sous access_key)
// Tant que l'endpoint n'est pas renseigné, le formulaire le dit franchement et
// bascule sur le téléphone et l'e-mail plutôt que de faire semblant.

const ENDPOINT = (import.meta.env.VITE_CONTACT_ENDPOINT || '').trim();
const CLE = (import.meta.env.VITE_CONTACT_KEY || '').trim();
const MAIL_DE_SECOURS = 'contact@spro.fr';
const TEL = '02 97 54 12 13';

const form = document.getElementById('contactForm');
const done = document.getElementById('cfDone');

if (form && done) {
  const bouton = form.querySelector('button[type="submit"]');
  const libelleInitial = bouton.textContent;

  const message = (texte, etat) => {
    done.textContent = texte;
    done.dataset.state = etat; // 'ok' | 'error' | 'pending' — stylé dans styles.css
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    // Piège à robots : un humain ne remplit jamais ce champ, il est masqué.
    if (form.elements.societe && form.elements.societe.value) return;

    const donnees = Object.fromEntries(new FormData(form).entries());
    delete donnees.societe;
    // Une case cochée arrive en « on » dans FormData. On l'envoie en clair :
    // c'est la trace du consentement, elle doit être lisible telle quelle dans
    // le message reçu, pas décodée après coup.
    donnees.consentement = donnees.consentement ? 'oui' : 'non';

    if (!ENDPOINT) {
      message(
        `L'envoi automatique n'est pas encore activé. Appelez-nous au ${TEL} ` +
        `ou écrivez à ${MAIL_DE_SECOURS} — nous répondons dans la journée.`,
        'error'
      );
      return;
    }

    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';
    message('', 'pending');

    try {
      const reponse = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...donnees,
          // Objet et destinataire lisibles dans la boîte de réception : sans ça
          // les demandes arrivent sous un objet générique du prestataire.
          subject: `Demande de devis — ${donnees.nom || 'site spro.fr'}`,
          from_name: 'Site spro.fr',
          origine: 'spro.fr — formulaire accueil',
          ...(CLE ? { access_key: CLE } : {}),
        }),
      });
      if (!reponse.ok) throw new Error('HTTP ' + reponse.status);

      form.reset();
      bouton.textContent = 'Demande envoyée';
      message('Merci, votre demande est bien arrivée. Nous vous recontactons rapidement.', 'ok');
    } catch (err) {
      bouton.disabled = false;
      bouton.textContent = libelleInitial;
      message(
        `L'envoi a échoué. Appelez-nous au ${TEL} ou écrivez à ${MAIL_DE_SECOURS}, ` +
        `nous traiterons votre demande directement.`,
        'error'
      );
      console.error('[contact] envoi impossible :', err);
    }
  });
}
