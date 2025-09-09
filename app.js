// Import des modules requis
const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Créer une application Express
const app = express();

// Middleware pour analyser les corps de requêtes en JSON
app.use(express.json());

// Définir le port et les jetons
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsAppToken = process.env.WHATSAPP_TOKEN;

// --- Nodemailer transporter setup ---
// Configurez Nodemailer pour envoyer des e-mails via Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lingalemohamed250@gmail.com", // Votre adresse e-mail d'envoi
    pass: process.env.EMAIL_PASS, // Votre mot de passe d'application généré
  },
});
// --- Fin de la configuration Nodemailer ---

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

// Fonction pour envoyer une notification par e-mail
async function sendEmailNotification(subject, text) {
  const mailOptions = {
    from: "lingalemohamed250@gmail.com", // Votre adresse d'envoi
    to: "lingalemohamed250@gmail.com", // Votre adresse de réception
    subject: subject,
    text: text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Notification par e-mail envoyée avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification par e-mail:", error);
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

    // Crée un nouvel objet avec les informations essentielles
    const essentialMessageInfo = {
      from: message.from,
      id: message.id,
      timestamp: message.timestamp,
      type: message.type,
      content: msgContent,
      media_data: mediaData // Ajoute les données de l'image/audio
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
