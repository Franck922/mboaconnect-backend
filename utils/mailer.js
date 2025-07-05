// utils/mailer.js
const nodemailer = require('nodemailer');

// Configuration du transporteur Nodemailer
// Les informations d'identification doivent être stockées dans votre fichier .env pour la sécurité
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true pour le port 465, false pour les autres ports
  auth: {
    user: process.env.EMAIL_USER, // Votre adresse email de service (celle qui envoie)
    pass: process.env.EMAIL_PASSWORD, // Votre mot de passe email
  },
  tls: {
    // Ne pas rejeter les certificats auto-signés. À utiliser avec prudence en production.
    rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
  }
});

// Fonction pour envoyer un email
const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Adresse de l'expéditeur (ex: "MboaConnect <no-reply@mbaconnect.com>")
    to: options.email,            // Adresse du destinataire (ADMIN_EMAIL dans votre cas)
    subject: options.subject,     // Sujet de l'email
    html: options.html,           // Contenu HTML de l'email
    text: options.text,           // Contenu texte brut (fallback si le client ne supporte pas le HTML)
    // NOUVEAU : Ajoutez l'option replyTo si elle est fournie
    replyTo: options.replyTo || process.env.EMAIL_FROM, // Si replyTo n'est pas fourni, utilisez l'adresse de l'expéditeur par défaut
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Backend (Nodemailer): Message envoyé: %s', info.messageId);
    console.log('Backend (Nodemailer): Réponse du serveur: %s', info.response);
    console.log('Backend (Nodemailer): Email info:', info);
  } catch (error) {
    console.error('Backend (Nodemailer): ERREUR lors de l\'envoi de l\'email:', error);
  }
};

module.exports = sendEmail;
