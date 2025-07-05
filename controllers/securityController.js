// controllers/securityController.js
const { Quote, User } = require('../models'); // Importer le modèle Quote et User pour l'inclusion
const sendEmail = require('../utils/mailer'); // Utilitaire pour l'envoi d'emails

// @desc    Créer une nouvelle demande de devis pour les systèmes de sécurité
// @route   POST /api/security/quotes
// @access  Public (peut être accédé par des utilisateurs non authentifiés, ou authentifiés si `req.user` est présent)
const createQuoteRequest = async (req, res) => {
  const { clientName, clientEmail, clientPhone, serviceType, description, preferredDate } = req.body;

  console.log('Backend: createQuoteRequest - Requête reçue avec corps:', req.body);

  // Validation basique
  if (!clientName || !clientEmail || !clientPhone || !serviceType || !description) {
    console.error('Backend: createQuoteRequest - Validation échouée (champs manquants).');
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires pour la demande de devis.' });
  }

  try {
    const userId = req.user && req.user.id ? req.user.id : null; // S'assurer que userId est bien extrait si l'utilisateur est connecté
    console.log(`Backend: createQuoteRequest - userId extrait du token (si existant) : ${userId}`);

    console.log('Backend: createQuoteRequest - Tentative de création de la demande de devis dans la base de données...');
    const quote = await Quote.create({
      userId: userId, // Associer à l'utilisateur connecté si disponible, sinon null
      clientName,
      clientEmail,
      clientPhone,
      serviceType,
      description,
      preferredDate: preferredDate || null, // Date préférée optionnelle
      status: 'pending', // Statut initial
    });
    console.log('Backend: createQuoteRequest - Demande de devis créée avec succès dans la BD:', quote.id);

    // Envoyer un email de notification à l'administrateur/équipe commerciale
    try {
      if (process.env.ADMIN_EMAIL) {
        console.log('Backend: createQuoteRequest - Tentative d\'envoi d\'email à l\'administrateur...');
        await sendEmail({
          email: process.env.ADMIN_EMAIL,
          subject: `Nouvelle demande de devis sécurité - ${serviceType} de ${clientName}`,
          html: `
            <p>Une nouvelle demande de devis pour un système de sécurité a été soumise :</p>
            <ul>
              <li><strong>Client :</strong> ${clientName}</li>
              <li><strong>Email :</strong> ${clientEmail}</li>
              <li><strong>Téléphone :</strong> ${clientPhone}</li>
              <li><strong>Service demandé :</strong> ${serviceType}</li>
              <li><strong>Description :</strong> ${description}</li>
              <li><strong>Date préférée :</strong> ${preferredDate ? new Date(preferredDate).toLocaleDateString('fr-FR') : 'Non spécifié'}</li>
              ${req.user ? `<li><strong>Soumis par l'utilisateur ID :</strong> ${req.user.id} (${req.user.email})</li>` : ''}
            </ul>
            <p>Veuillez vous connecter à l'interface d'administration pour l'examiner.</p>
          `,
          text: `Nouvelle demande de devis : ${clientName}, ${serviceType}. Vérifiez le panneau d'administration.`
        });
        console.log('Backend: createQuoteRequest - Email administrateur envoyé avec succès.');
      } else {
        console.warn('Backend: createQuoteRequest - ADMIN_EMAIL non défini dans .env. L\'email de notification admin a été ignoré pour la nouvelle demande de devis.');
      }
    } catch (emailError) {
      console.error('Backend: createQuoteRequest - ERREUR lors de l\'envoi de l\'email administrateur:', emailError);
      // Ne pas renvoyer une erreur 500 juste pour l'échec de l'email, mais logguer et continuer
    }

    res.status(201).json({ message: 'Demande de devis soumise avec succès. Nous vous contacterons bientôt.', quote });
  } catch (error) {
    console.error('Backend: createQuoteRequest - ERREUR CRITIQUE lors de la soumission de la demande de devis ou de la création en BD:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la soumission de la demande de devis' });
  }
};

// @desc    Obtenir toutes les demandes de devis (Admin seulement)
// @route   GET /api/security/quotes
// @access  Private/Admin
const getAllQuotes = async (req, res) => {
  try {
    console.log('Backend: getAllQuotes - Tentative de récupération de toutes les demandes de devis pour l\'admin.');
    const quotes = await Quote.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    console.log(`Backend: getAllQuotes - ${quotes.length} devis trouvés.`);
    res.json(quotes);
  } catch (error) {
    console.error('Erreur dans getAllQuotes :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de toutes les demandes de devis' });
  }
};

// @desc    Obtenir les devis de l'utilisateur actuel
// @route   GET /api/security/myquotes
// @access  Private (pour les utilisateurs authentifiés)
const getMyQuotes = async (req, res) => {
  try {
    console.log('Backend: getMyQuotes - Requête reçue pour les devis de l\'utilisateur.');
    // S'assurer que l'utilisateur est authentifié pour accéder à ses devis
    if (!req.user || !req.user.id) {
      console.warn('Backend: getMyQuotes - Non autorisé: utilisateur non connecté ou ID manquant dans le token.');
      return res.status(401).json({ message: 'Non autorisé: utilisateur non connecté ou ID manquant.' });
    }

    const userId = req.user.id;
    console.log(`Backend: getMyQuotes - Récupération des devis pour l'utilisateur ID: ${userId}`);

    const quotes = await Quote.findAll({
      where: { userId: userId }, // Filtrer par l'ID de l'utilisateur connecté
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    console.log(`Backend: getMyQuotes - ${quotes.length} devis trouvés pour l'utilisateur ID: ${userId}.`);
    res.json(quotes);
  } catch (error) {
    console.error('Erreur dans getMyQuotes :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de mes demandes de devis' });
  }
};


// @desc    Obtenir une seule demande de devis par ID (Admin ou l'utilisateur qui l'a soumise)
// @route   GET /api/security/quotes/:id
// @access  Private
const getQuoteById = async (req, res) => {
  try {
    console.log(`Backend: getQuoteById - Récupération du devis ID: ${req.params.id}`);
    const quote = await Quote.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'] }
      ]
    });

    if (!quote) {
      console.warn(`Backend: getQuoteById - Devis ID ${req.params.id} non trouvé.`);
      return res.status(404).json({ message: 'Demande de devis non trouvée' });
    }

    // Autorisation : permettre au propriétaire ou à l'administrateur de visualiser
    // Si quote.userId est nul (utilisateur non enregistré), seul un admin peut le voir.
    if (req.user) { // Si un utilisateur est connecté
      if (!req.user.isAdmin && quote.userId !== req.user.id) {
        console.warn(`Backend: getQuoteById - Utilisateur ${req.user.id} non autorisé à consulter le devis ${req.params.id}. Pas admin et pas propriétaire.`);
        return res.status(403).json({ message: 'Non autorisé à consulter cette demande de devis.' });
      }
    } else { // Si aucun utilisateur n'est connecté et que le devis a un userId, interdire
      if (quote.userId) { // Si le devis est lié à un utilisateur enregistré mais personne n'est connecté
        console.warn(`Backend: getQuoteById - Accès non authentifié au devis ${req.params.id} lié à un utilisateur enregistré.`);
        return res.status(403).json({ message: 'Non autorisé à consulter cette demande de devis sans être connecté ou administrateur.' });
      }
      // Si le devis n'a pas de userId, il a été créé par un non-authentifié.
      // Par défaut, nous n'avons pas de mécanisme pour les non-authentifiés pour revoir *leurs* devis
      // Nous allons donc interdire l'accès public à un devis sans userId s'il est récupéré par ID.
      console.warn(`Backend: getQuoteById - Accès non authentifié au devis ${req.params.id} (sans userId). Accès refusé par défaut.`);
      return res.status(403).json({ message: 'Non autorisé à consulter cette demande de devis. Veuillez vous connecter ou être administrateur.' });
    }
    console.log(`Backend: getQuoteById - Devis ID ${req.params.id} récupéré avec succès.`);
    res.json(quote);
  } catch (error) {
    console.error('Erreur dans getQuoteById :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la demande de devis par ID' });
  }
};


// @desc    Mettre à jour le statut, les notes ou le coût estimé d'une demande de devis (Admin seulement)
// @route   PUT /api/security/quotes/:id
// @access  Private/Admin
const updateQuote = async (req, res) => {
  const { status, adminNotes, estimatedCost } = req.body;
  const { id } = req.params; // S'assurer que l'ID est bien extrait des paramètres

  console.log(`Backend: updateQuote - Requête de mise à jour pour le devis ID: ${id} avec statut: ${status}, notes: "${adminNotes}", coût: ${estimatedCost}`);

  // Optionnel : Ajouter une validation pour l'énumération `status`
  if (status && !['pending', 'reviewed', 'approved', 'rejected', 'completed'].includes(status)) {
    console.warn(`Backend: updateQuote - Statut invalide fourni pour le devis ${id}: ${status}`);
    return res.status(400).json({ message: 'Statut invalide fourni.' });
  }

  try {
    const quote = await Quote.findByPk(id); // Utilisation de l'ID des paramètres
    if (!quote) {
      console.warn(`Backend: updateQuote - Devis ID ${id} non trouvé pour la mise à jour.`);
      return res.status(404).json({ message: 'Demande de devis non trouvée' });
    }

    // Mettre à jour les champs si fournis
    quote.status = status !== undefined ? status : quote.status;
    quote.adminNotes = adminNotes !== undefined ? adminNotes : quote.adminNotes;
    quote.estimatedCost = estimatedCost !== undefined ? parseFloat(estimatedCost) : quote.estimatedCost;

    const updatedQuote = await quote.save();
    console.log(`Backend: updateQuote - Devis ID ${id} mis à jour avec succès. Nouveau statut: ${updatedQuote.status}`);

    // Envoyer une notification par email au client si le statut change ou le coût est estimé
    if (status || estimatedCost) {
        try {
            await sendEmail({
                email: updatedQuote.clientEmail,
                subject: `Mise à jour de votre demande de devis MboaConnect - Réf: #${updatedQuote.id}`,
                html: `
                    <p>Cher(e) ${updatedQuote.clientName},</p>
                    <p>Le statut de votre demande de devis pour un système de sécurité (Réf: #${updatedQuote.id}) a été mis à jour :</p>
                    <ul>
                        <li><strong>Statut actuel :</strong> <strong>${updatedQuote.status.toUpperCase()}</strong></li>
                        ${updatedQuote.estimatedCost ? `<li><strong>Coût estimé :</strong> ${parseFloat(updatedQuote.estimatedCost).toFixed(2)} XAF</li>` : ''}
                        ${updatedQuote.adminNotes ? `<li><strong>Nos notes :</strong> ${updatedQuote.adminNotes}</li>` : ''}
                    </ul>
                    <p>Veuillez nous contacter pour plus d'informations ou pour procéder.</p>
                    <p>Merci,</p>
                    <p>L'équipe MboaConnect</p>
                `,
                text: `Votre demande de devis #${updatedQuote.id} a été mise à jour. Statut : ${updatedQuote.status}.`
            });
            console.log(`Backend: updateQuote - Email de mise à jour de devis envoyé au client ${updatedQuote.clientEmail}`);
        } catch (emailUpdateError) {
            console.error('Erreur lors de l\'envoi de l\'email de mise à jour au client:', emailUpdateError);
        }
    }

    res.json(updatedQuote);
  } catch (error) {
    console.error('Erreur dans updateQuote :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la demande de devis' });
  }
};

// @desc    Supprimer une demande de devis (Admin seulement)
// @route   DELETE /api/security/quotes/:id
// @access  Private/Admin
const deleteQuote = async (req, res) => {
  const { id } = req.params; // S'assurer que l'ID est bien extrait des paramètres
  console.log(`Backend: deleteQuote - Requête de suppression pour le devis ID: ${id}`);
  try {
    const quote = await Quote.findByPk(id); // Utilisation de l'ID des paramètres
    if (!quote) {
      console.warn(`Backend: deleteQuote - Devis ID ${id} non trouvé pour la suppression.`);
      return res.status(404).json({ message: 'Demande de devis non trouvée' });
    }
    await quote.destroy();
    console.log(`Backend: deleteQuote - Devis ID ${id} supprimé avec succès.`);
    res.json({ message: 'Demande de devis supprimée avec succès' });
  } catch (error) {
    console.error('Erreur dans deleteQuote :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la demande de devis' });
  }
};

module.exports = {
  createQuoteRequest,
  getAllQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  getMyQuotes, // <--- AJOUTÉ ICI POUR L'EXPORT
};
