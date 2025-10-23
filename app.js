// Import des modules requis
const express = require("express");
const axios = require("axios");

// Import dynamique pour Resend (ESM compatible CommonJS)
(async () => {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const app = express();
  app.use(express.json());

  // Variables d'environnement
  const port = process.env.PORT || 10000;
  const verifyToken = process.env.VERIFY_TOKEN;
  const whatsAppToken = process.env.WHATSAPP_TOKEN;

  // Fonction pour récupérer les métadonnées d'un média WhatsApp
  async function getWhatsAppMediaUrl(mediaId, token) {
    try {
      const response = await axios({
        url: `https://graph.facebook.com/v19.0/${mediaId}`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur récupération fichier ${mediaId}:`, error.message);
      return null;
    }
  }

  // Fonction pour envoyer un email via Resend
  async function sendEmailNotification(subject, text) {
    try {
      await resend.emails.send({
        from: "noreply@webhook-app.dev",
        to: "lingalemohamed250@gmail.com",
        subject,
        text,
      });
      console.log("✅ Notification envoyée via Resend !");
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de la notification :", error);
    }
  }

  // Route GET pour vérification webhook
  app.get("/", (req, res) => {
    const { "hub.mode": mode, "hub.challenge": challenge, "hub.verify_token": token } = req.query;
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WEBHOOK VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.status(403).end();
    }
  });

  // Route POST pour réception des payloads WhatsApp
  app.post("/", async (req, res) => {
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    console.log(`\n\nWebhook reçu ${timestamp}\n`);
    console.log(JSON.stringify(req.body, null, 2));

    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message) {
      let msgContent, emailSubject, mediaData = null;

      switch (message.type) {
        case "text":
          msgContent = message.text.body;
          emailSubject = "Nouveau message texte WhatsApp";
          break;
        case "image":
          msgContent = `Image reçue : ${message.image.id}`;
          emailSubject = "Nouvelle image WhatsApp";
          mediaData = await getWhatsAppMediaUrl(message.image.id, whatsAppToken);
          break;
        case "document":
          msgContent = `Document reçu : ${message.document.filename} (ID: ${message.document.id})`;
          emailSubject = "Nouveau document WhatsApp";
          mediaData = await getWhatsAppMediaUrl(message.document.id, whatsAppToken);
          break;
        case "audio":
          msgContent = `Audio reçu : ${message.audio.id}`;
          emailSubject = "Nouveau message audio WhatsApp";
          mediaData = await getWhatsAppMediaUrl(message.audio.id, whatsAppToken);
          break;
        case "video":
          msgContent = `Vidéo reçue : ${message.video.id}`;
          emailSubject = "Nouvelle vidéo WhatsApp";
          mediaData = await getWhatsAppMediaUrl(message.video.id, whatsAppToken);
          break;
        default:
          msgContent = `Type inconnu : ${message.type}`;
          emailSubject = "Nouveau message WhatsApp (type inconnu)";
      }

      const essentialMessageInfo = {
        from: message.from,
        id: message.id,
        timestamp: message.timestamp,
        type: message.type,
        content: msgContent,
        media_data: mediaData,
      };

      await sendEmailNotification(emailSubject, JSON.stringify(essentialMessageInfo, null, 2));
    } else {
      console.log("Pas de message détecté (peut-être un statut).");
    }

    res.status(200).end();
  });

  // Démarrer le serveur
  app.listen(port, () => {
    console.log(`🚀 Serveur Webhook WhatsApp en écoute sur le port ${port}`);
  });
})();
