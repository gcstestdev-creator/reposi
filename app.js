// Import des modules requis
const express = require("express");
const nodemailer = require("nodemailer");

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
    user: "mohamedlingale250@gmail.com", // Votre adresse e-mail d'envoi
    pass: process.env.EMAIL_PASS, // Votre mot de passe d'application généré
  },
});
// --- Fin de la configuration Nodemailer ---

// Fonction pour envoyer une notification par e-mail
async function sendEmailNotification(subject, text) {
  const mailOptions = {
    from: "mohamedlingale250@gmail.com", // Votre adresse d'envoi
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
app.get("/webhook", (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route pour les requêtes POST (réception des payloads de webhook)
app.post("/webhook", async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Extrait le message en toute sécurité
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message && message.type === "text") {
    const from = message.from;
    const msgBody = message.text.body;

    const emailSubject = `Nouveau message WhatsApp de ${from}`;
    const emailText = `Vous avez reçu le message suivant :\n\n"${msgBody}"`;

    await sendEmailNotification(emailSubject, emailText);
  } else {
    console.log("Message non textuel ou payload inattendu reçu.");
  }

  // Toujours répondre avec 200 OK pour accuser réception de l'événement
  res.status(200).end();
});

// Route de base pour un message de bienvenue simple
app.get("/", (req, res) => {
  res.send(`Votre serveur de webhook est en cours d'exécution.`);
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
  console.log(`Assurez-vous de définir les variables d'environnement VERIFY_TOKEN et EMAIL_PASS.`);
});
