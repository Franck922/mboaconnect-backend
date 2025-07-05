// backend/controllers/contactController.js
const sendEmail = require('../utils/mailer'); // Assurez-vous que votre utilitaire mailer est correct

// @desc    Soumettre le formulaire de contact
// @route   POST /api/contact
// @access  Public
const submitContactForm = async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation simple
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs du formulaire de contact.' });
  }

  try {
    // Envoyer un email à l'administrateur avec le message de contact
    if (process.env.ADMIN_EMAIL) {
      await sendEmail({
        email: process.env.ADMIN_EMAIL, // L'adresse email où vous voulez recevoir les messages de contact
        subject: `Nouveau message de contact : ${subject} de ${name}`,
        html: `
          <p>Vous avez reçu un nouveau message via le formulaire de contact de MboaConnect :</p>
          <ul>
            <li><strong>De :</strong> ${name} (${email})</li>
            <li><strong>Sujet :</strong> ${subject}</li>
            <li><strong>Message :</strong><br><p style="white-space: pre-wrap;">${message}</p></li>
          </ul>
          <p>Veuillez répondre directement à l'expéditeur via son email : ${email}</p>
        `,
        text: `Nouveau message de contact de ${name} (${email}) - Sujet: ${subject}\nMessage: ${message}`
      });
      console.log('Backend: Message de contact envoyé par email à l\'administrateur.');
    } else {
      console.warn('Backend: ADMIN_EMAIL non défini dans .env. Le message de contact a été reçu mais l\'email de notification n\'a pas été envoyé.');
    }

    res.status(200).json({ message: 'Votre message a été envoyé avec succès !' });
  } catch (error) {
    console.error('Erreur lors de la soumission du formulaire de contact:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'envoi de votre message.' });
  }
};

module.exports = {
  submitContactForm,
};
