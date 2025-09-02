"use strict";

const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// Load environment variables
const WEBHOOK_VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const EMAIL_PASS = process.env.EMAIL_PASS;
const PORT = process.env.PORT || 1337;

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lingalemohamed250@gmail.com", // Your sending email address
    pass: EMAIL_PASS, // Use environment variable for security
  },
});

// Function to send email
async function sendEmail(messageData) {
  const mailOptions = {
    from: "lingalemohamed250@gmail.com",
    to: "lingalemohamed250@gmail.com", // Your actual recipient email
    subject: "New WhatsApp Message Received",
    text: JSON.stringify(messageData, null, 2), // Attach JSON data to the email body
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email notification sent successfully!");
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
}

// Webhook Verification Endpoint (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook Payload Endpoint (POST)
app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook payload:", JSON.stringify(req.body, null, 2));

  // Extract the message object safely
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message) {
    const from = message.from;
    const msg_body = message.text?.body || "N/A"; // Handle non-text messages
    const phone_number_id = req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    const messageData = {
      from: from,
      msg_body: msg_body,
      phone_number_id: phone_number_id,
      timestamp: message.timestamp,
      type: message.type
    };

    // Send email with extracted data
    await sendEmail(messageData);
  }

  // Always respond with a 200 OK
  res.sendStatus(200);
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Webhook is listening on port ${PORT}`);
});
