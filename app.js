// Import des modules requis
const express = require('express');
const nodemailer = require('nodemailer');

// Créer une application Express
const app = express();

// Middleware pour analyser les corps de requêtes en JSON
app.use(express.json());

// Définir le port et le jeton de vérification
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

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
    console.log("Email notification sent successfully!");
  } catch (error) {
    console.error("Error sending email notification:", error);
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
  console.log(`\n\nWebhook received ${timestamp}\n`);

  // Extrait le message en toute sécurité
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  // Si un message valide a été trouvé, préparez le corps de l'e-mail
  if (message) {
    const emailSubject = `Nouveau message WhatsApp (Payload JSON)`;
    // Convertit l'objet de la requête en une chaîne JSON formatée
    const emailText = JSON.stringify(req.body, null, 2);

    await sendEmailNotification(emailSubject, emailText);
  } else {
    console.log("Payload inattendu reçu.");
  }
  
  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
