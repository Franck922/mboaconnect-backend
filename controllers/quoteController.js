// Assurez-vous d'avoir bien importé sendEmail et QuoteRequest
const sendEmail = require('../utils/mailer');
const QuoteRequest = require('../models/QuoteRequest'); // Assurez-vous que le chemin est correct

// Dans votre fonction createQuoteRequest (ou fonction similaire)
exports.createQuoteRequest = async (req, res) => {
  try {
    // 1. Créez la demande de devis dans la base de données
    const quoteRequest = await QuoteRequest.create(req.body);
    console.log('Backend: createQuoteRequest - Demande de devis créée avec succès dans la BD:', quoteRequest.id);

    // Récupérez l'email de l'utilisateur qui fait la demande
    const userEmail = req.body.email; // Supposons que l'email de l'utilisateur est dans req.body.email
    const userName = req.body.name || 'Un utilisateur'; // Supposons que le nom est dans req.body.name

    // 2. Préparez le contenu de l'email pour l'administrateur
    const adminEmailSubject = `Nouvelle demande de devis de sécurité de ${userName}`;
    const adminEmailText = `
      Bonjour Administrateur,

      Une nouvelle demande de devis de sécurité a été soumise.
      Détails de la demande (ID: ${quoteRequest.id}):
      - Nom: ${userName}
      - Email: ${userEmail}
      - Téléphone: ${req.body.phone || 'Non fourni'}
      - Type de service: ${req.body.serviceType || 'Non spécifié'}
      - Message: ${req.body.message || 'Aucun message.'}

      Vous pouvez contacter l'utilisateur directement en répondant à cet email.
    `;

    // --- DEBUT DU CONTENU HTML AMELIORE AVEC CSS EN LIGNE ---
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${adminEmailSubject}</title>
      </head>
      <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; color: #333;">
          <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e0e0e0;">
              <div class="header" style="background-color: #0056b3; padding: 25px 20px; text-align: center;">
                  <!-- REMPLACEZ L'URL CI-DESSOUS PAR CELLE DE VOTRE VRAI LOGO HEBERGE -->
                  <img src="https://placehold.co/150x50/0056b3/ffffff?text=Votre+Logo" alt="Logo MboaConnect" style="max-width: 150px; height: auto; border-radius: 8px;">
                  <h1 style="color: #ffffff; font-size: 24px; margin-top: 15px; margin-bottom: 0;">Nouvelle demande de devis</h1>
              </div>
              <div class="content" style="padding: 30px 25px; line-height: 1.7;">
                  <p style="margin-bottom: 15px;">Bonjour Administrateur,</p>
                  <p style="margin-bottom: 25px;">Une <strong style="color: #004085;">nouvelle demande de devis de sécurité</strong> a été soumise sur votre site par un utilisateur. Veuillez trouver les détails ci-dessous :</p>

                  <div class="details-box" style="background-color: #f0f8ff; border: 1px solid #d0e0ff; border-left: 5px solid #0056b3; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                      <h2 style="color: #0056b3; font-size: 20px; margin-top: 0; margin-bottom: 20px;">Détails de la demande :</h2>
                      <ul style="list-style: none; padding: 0; margin: 0;">
                          <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e9ecef;"><strong>ID de la demande :</strong> ${quoteRequest.id}</li>
                          <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e9ecef;"><strong>Nom de l'utilisateur :</strong> ${userName}</li>
                          <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e9ecef;"><strong>Email de l'utilisateur :</strong> <a href="mailto:${userEmail}" style="color: #0056b3; text-decoration: none;">${userEmail}</a></li>
                          <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e9ecef;"><strong>Téléphone :</strong> ${req.body.phone || 'Non fourni'}</li>
                          <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e9ecef;"><strong>Type de service demandé :</strong> ${req.body.serviceType || 'Non spécifié'}</li>
                          <li style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;"><strong>Message de l'utilisateur :</strong> <br>${req.body.message ? req.body.message.replace(/\n/g, '<br>') : 'Aucun message.'}</li>
                      </ul>
                  </div>

                  <p style="margin-bottom: 25px;">Pour répondre à cette demande rapidement, vous pouvez simplement cliquer sur le bouton ci-dessous, ou utiliser la fonction "Répondre" de votre client de messagerie.</p>

                  <div class="button-container" style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                      <a href="mailto:${userEmail}" class="button" style="display: inline-block; background-color: #28a745; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;">Répondre à l'utilisateur</a>
                  </div>

                  <p style="margin-top: 25px; margin-bottom: 5px;">Nous vous remercions de votre diligence.</p>
                  <p style="margin-bottom: 0;">Cordialement,</p>
                  <p style="margin-top: 5px;">L'équipe de MboaConnect</p>
              </div>
              <div class="footer" style="text-align: center; padding: 20px 25px; font-size: 12px; color: #777; border-top: 1px solid #eee; margin-top: 20px;">
                  <p style="margin: 0;">&copy; ${new Date().getFullYear()} MboaConnect. Tous droits réservés.</p>
              </div>
          </div>
      </body>
      </html>
    `;
    // --- FIN DU CONTENU HTML AMELIORE AVEC CSS EN LIGNE ---


    // 3. Envoyez l'email à l'administrateur
    console.log('Backend: createQuoteRequest - Tentative d\'envoi d\'email à l\'administrateur...');
    await sendEmail({
      email: process.env.ADMIN_EMAIL, // L'administrateur reçoit l'email
      subject: adminEmailSubject,
      text: adminEmailText,
      html: adminEmailHtml,
      replyTo: userEmail, // Définit l'adresse de réponse comme celle de l'utilisateur
    });
    console.log('Backend: createQuoteRequest - Email administrateur envoyé avec succès.');

    // 4. Envoyez une réponse au frontend
    res.status(201).json({
      success: true,
      data: quoteRequest,
      message: 'Demande de devis soumise avec succès. Un administrateur vous contactera bientôt.',
    });

  } catch (error) {
    console.error('Backend: createQuoteRequest - ERREUR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erreur lors de la soumission de la demande de devis.',
    });
  }
};
