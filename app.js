// Import des modules requis
const express = require('express');
const axios = require('axios');
const { Resend } = require('resend');

// Créer une application Express
const app = express();

// Middleware pour analyser les corps de requêtes en JSON
app.use(express.json());

// Définir le port et les jetons
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsAppToken = process.env.WHATSAPP_TOKEN;

// --- Resend setup ---
const resend = new Resend(process.env.RESEND_API_KEY);

// Fonction pour récupérer les métadonnées d'un fichier de l'API WhatsApp
async function getWhatsAppMediaUrl(mediaId, token) {
  try {
    const response = await axios({
      url: `https://graph.facebook.com/v19.0/${mediaId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées du fichier ${mediaId}:`, error.message);
    return null;
  }
}

// Fonction pour envoyer une notification par e-mail via Resend
async function sendEmailNotification(subject, text) {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'lingalemohamed250@gmail.com',
      subject: subject,
      text: text,
    });
    console.log("Notification par e-mail envoyée via Resend !");
  } catch (error) {
    console.error("Erreur en envoyant l'email via Resend :", error);
  }
}

// Route pour les requêtes GET (vérification du webhook)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route pour les requêtes POST (réception des payloads de webhook)
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook reçu ${timestamp}\n`);
  
  // Extraire le message pour le débogage
  console.log(JSON.stringify(req.body, null, 2));

  // Vérifier si la requête est un message WhatsApp
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message) {
    let msgContent;
    let emailSubject;
    let mediaData = null;

    switch (message.type) {
      case 'text':
        msgContent = message.text.body;
        emailSubject = `Nouveau message texte WhatsApp`;
        break;
      case 'image':
        msgContent = `Message de type "image" reçu. ID de l'image : ${message.image.id}`;
        emailSubject = `Nouvelle image WhatsApp`;
        mediaData = await getWhatsAppMediaUrl(message.image.id, whatsAppToken);
        break;
      case 'document':
        msgContent = `Message de type "document" reçu. Nom du document : ${message.document.filename}, ID : ${message.document.id}`;
        emailSubject = `Nouveau document WhatsApp`;
        mediaData = await getWhatsAppMediaUrl(message.document.id, whatsAppToken);
        break;
      case 'audio':
        msgContent = `Message de type "audio" reçu. ID audio : ${message.audio.id}`;
        emailSubject = `Nouveau message audio WhatsApp`;
        mediaData = await getWhatsAppMediaUrl(message.audio.id, whatsAppToken);
        break;
      case 'video':
        msgContent = `Message de type "vidéo" reçu. ID de la vidéo : ${message.video.id}`;
        emailSubject = `Nouvelle vidéo WhatsApp`;
        mediaData = await getWhatsAppMediaUrl(message.video.id, whatsAppToken);
        break;
      default:
        msgContent = `Message de type inconnu ou non pris en charge : ${message.type}`;
        emailSubject = `Nouveau message WhatsApp - Type inconnu`;
    }

    // Crée un objet avec les informations essentielles
    const essentialMessageInfo = {
      from: message.from,
      id: message.id,
      timestamp: message.timestamp,
      type: message.type,
      content: msgContent,
      media_data: mediaData
    };
    
    const emailText = JSON.stringify(essentialMessageInfo, null, 2);

    await sendEmailNotification(emailSubject, emailText);

  } else {
    console.log('Payload inattendu ou sans message, possiblement une mise à jour de statut.');
  }
  
  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
