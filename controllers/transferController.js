// controllers/transferController.js
const { Transaction } = require('../models');
const sendEmail = require('../utils/mailer');
const axios = require('axios'); // Pour les appels d'API externes, ex: taux de change
const { Op } = require('sequelize'); // Importez Op pour les opérateurs Sequelize

// Fonction utilitaire pour générer un numéro de référence de transaction unique
const generateTransactionRef = () => {
  return 'TRF-' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// @desc    Simuler un transfert d'argent (envoi d'argent)
// @route   POST /api/transfers/send
// @access  Public (ou Private si seuls les utilisateurs authentifiés peuvent envoyer)
const sendMoney = async (req, res) => {
  const {
    senderName, senderEmail, senderPhone,
    receiverName, receiverEmail, receiverPhone,
    amountSent, currencySent, currencyReceived
  } = req.body;

  // Validation basique
  if (!senderName || !receiverName || !receiverPhone || !amountSent || !currencySent || !currencyReceived) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires' });
  }

  // S'assurer que amountSent est un nombre positif
  if (isNaN(amountSent) || parseFloat(amountSent) <= 0) {
      return res.status(400).json({ message: 'Le montant envoyé doit être un nombre positif.' });
  }

  try {
    let exchangeRate = 1; // Par défaut à 1 si même devise ou pas d'API utilisée
    let fees = 0; // Initialiser les frais

    // 1. Calcul dynamique des frais et taux de change (en utilisant une API fictive ou réelle)
    if (currencySent !== currencyReceived) {
      // --- INTÉGRER UNE VÉRITABLE API DE TAUX DE CHANGE ICI ---
      // Exemple avec une URL et une clé d'API de placeholder de .env :
      // if (process.env.API_EXCHANGERATE_URL && process.env.API_EXCHANGERATE_KEY) {
      //   try {
      //     const response = await axios.get(`${process.env.API_EXCHANGERATE_URL}/latest?base=${currencySent}&symbols=${currencyReceived}&apikey=${process.env.API_EXCHANGERATE_KEY}`);
      //     exchangeRate = response.data.rates[currencyReceived];
      //   } catch (apiError) {
      //     console.warn('Échec de la récupération du taux de change réel, utilisation de taux fictifs. Erreur :', apiError.message);
      //     // Retour aux taux fictifs si l'appel API échoue (pour le développement/démo)
      //     if (currencySent === 'EUR' && currencyReceived === 'XAF') exchangeRate = 655.957;
      //     else if (currencySent === 'USD' && currencyReceived === 'XAF') exchangeRate = 600;
      //     else if (currencySent === 'XAF' && currencyReceived === 'USD') exchangeRate = 1 / 600;
      //     else if (currencySent === 'XAF' && currencyReceived === 'EUR') exchangeRate = 1 / 655.957;
      //   }
      // } else {
      //   console.warn('URL ou clé API de taux de change non définies dans .env, utilisation de taux fictifs.');
      //   // Taux fictifs pour la démonstration si aucune API réelle n'est configurée
      //   if (currencySent === 'EUR' && currencyReceived === 'XAF') exchangeRate = 655.957;
      //   else if (currencySent === 'USD' && currencyReceived === 'XAF') exchangeRate = 600;
      //   else if (currencySent === 'XAF' && currencyReceived === 'USD') exchangeRate = 1 / 600;
      //   else if (currencySent === 'XAF' && currencyReceived === 'EUR') exchangeRate = 1 / 655.957;
      // }

      // *** Taux de change fictifs simplifiés pour des tests rapides ***
      if (currencySent === 'EUR' && currencyReceived === 'XAF') exchangeRate = 655.957;
      else if (currencySent === 'USD' && currencyReceived === 'XAF') exchangeRate = 600;
      else if (currencySent === 'XAF' && currencyReceived === 'USD') exchangeRate = 1 / 600;
      else if (currencySent === 'XAF' && currencyReceived === 'EUR') exchangeRate = 1 / 655.957;
      // Si les devises sont les mêmes, exchangeRate reste 1.
    }

    // Simuler les frais (ex: 1% du montant envoyé + frais fixes)
    fees = (parseFloat(amountSent) * 0.01) + 500; // 1% + 500 XAF de frais fixes (exemple)

    const amountReceivedCalculated = (parseFloat(amountSent) - fees) * exchangeRate;
    const transactionRef = generateTransactionRef();

    // 2. Enregistrer la transaction dans la base de données
    const transaction = await Transaction.create({
      senderName,
      senderEmail,
      senderPhone,
      receiverName,
      receiverEmail,
      receiverPhone,
      amountSent: parseFloat(amountSent).toFixed(2),
      currencySent,
      amountReceived: amountReceivedCalculated.toFixed(2), // Arrondir à 2 décimales
      currencyReceived,
      exchangeRate: exchangeRate.toFixed(4), // Arrondir à 4 décimales pour la précision
      fees: fees.toFixed(2),
      status: 'pending', // Statut initial
      transactionRef,
    });

    // 3. Générer le reçu et envoyer l'email (simulation)
    const emailSubject = `Confirmation de transfert d'argent MboaConnect - Réf: ${transactionRef}`;
    const emailHtml = `
      <p>Cher(e) ${senderName},</p>
      <p>Votre transfert d'argent a été initié avec succès. Voici les détails :</p>
      <ul>
        <li><strong>Référence de transaction :</strong> ${transactionRef}</li>
        <li><strong>Montant envoyé :</strong> ${parseFloat(amountSent).toFixed(2)} ${currencySent}</li>
        <li><strong>Frais :</strong> ${fees.toFixed(2)} ${currencySent}</li>
        <li><strong>Montant à recevoir par le bénéficiaire :</strong> ${amountReceivedCalculated.toFixed(2)} ${currencyReceived}</li>
        <li><strong>Bénéficiaire :</strong> ${receiverName} (${receiverPhone})</li>
        <li><strong>Statut :</strong> En attente de traitement</li>
      </ul>
      <p>Vous recevrez une notification lorsque le statut de la transaction changera.</p>
      <p>Merci d'utiliser MboaConnect.</p>
    `;

    if (senderEmail) {
      await sendEmail({
        email: senderEmail,
        subject: emailSubject,
        html: emailHtml,
        text: `Votre transfert Réf: ${transactionRef} a été initié. Montant : ${parseFloat(amountSent).toFixed(2)} ${currencySent}. Bénéficiaire : ${receiverName}.`
      });
    }

    res.status(201).json({
      message: 'Transfert initié avec succès',
      transactionRef: transaction.transactionRef,
      amountReceived: transaction.amountReceived,
      fees: transaction.fees,
      exchangeRate: transaction.exchangeRate,
      status: transaction.status,
    });

  } catch (error) {
    console.error('Erreur dans sendMoney :', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'initiation du transfert' });
  }
};

// @desc    Obtenir l'historique des transactions (Admin seulement pour tous, utilisateur spécifique pour les siennes)
// @route   GET /api/transfers
// @access  Private/Admin
const getTransactions = async (req, res) => {
  try {
    let transactions;
    console.log('getTransactions: req.user =', req.user); // <-- AJOUT POUR DÉBOGAGE

    if (req.user && req.user.isAdmin) {
      // L'administrateur peut voir toutes les transactions
      transactions = await Transaction.findAll({
        order: [['createdAt', 'DESC']]
      });
    } else if (req.user) {
      // Les utilisateurs non-administrateurs peuvent UNIQUEMENT voir les transactions dans lesquelles ils sont impliqués.
      transactions = await Transaction.findAll({
          where: {
              [Op.or]: [ // Utilisation de Op importé
                { senderEmail: req.user.email },
                { receiverEmail: req.user.email },
                { senderPhone: req.user.phoneNumber },
                { receiverPhone: req.user.phoneNumber }
              ]
          },
          order: [['createdAt', 'DESC']]
      });
      // MODIFIÉ : Retourne un tableau vide avec statut 200 si aucune transaction n'est trouvée pour l'utilisateur
      // au lieu d'un 404.
      if (transactions.length === 0) {
        return res.status(200).json([]); // <-- CORRECTION ICI !
      }
    } else { // Si aucun utilisateur n'est connecté (middleware protect devrait gérer ça, mais sécurité supplémentaire)
      return res.status(401).json({ message: 'Non autorisé: Veuillez vous connecter pour voir vos transactions.' });
    }
    res.json(transactions);
  } catch (error) {
    console.error('Erreur dans getTransactions :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des transactions' });
  }
};

// @desc    Obtenir une seule transaction par son numéro de référence
// @route   GET /api/transfers/:ref
// @access  Public (à des fins de suivi, ou Private si un token est requis)
const getTransactionByRef = async (req, res) => {
  const { ref } = req.params;
  try {
    const transaction = await Transaction.findOne({ where: { transactionRef: ref } });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' });
    }

    // Optionnel : Si cette route est privée, ajouter une vérification d'autorisation ici
    // par exemple, if (!req.user.isAdmin && req.user.email !== transaction.senderEmail && req.user.phoneNumber !== transaction.senderPhone && ...) {
    //   return res.status(403).json({ message: 'Non autorisé à consulter cette transaction' });
    // }

    res.json(transaction);
  } catch (error) {
    console.error('Erreur dans getTransactionByRef :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la transaction par référence' });
  }
};

// @desc    Mettre à jour le statut d'une transaction (Admin seulement)
// @route   PUT /api/transfers/:id/status
// @access  Private/Admin
const updateTransactionStatus = async (req, res) => {
  const { status } = req.body; // Valeurs de statut attendues : 'completed', 'failed', 'cancelled'

  if (!status || !['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Statut invalide fourni.' });
  }

  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' });
    }

    transaction.status = status;
    const updatedTransaction = await transaction.save();

    // Optionnel : Envoyer une notification par email à l'expéditeur/récepteur concernant le changement de statut
    const emailSubject = `Mise à jour du transfert MboaConnect - Réf: ${updatedTransaction.transactionRef}`;
    const emailHtml = `
      <p>Cher(e) ${updatedTransaction.senderName},</p>
      <p>Le statut de votre transfert avec la référence <strong>${updatedTransaction.transactionRef}</strong> a été mis à jour à : <strong>${updatedTransaction.status.toUpperCase()}</strong>.</p>
      <p>Bénéficiaire : ${updatedTransaction.receiverName} (${updatedTransaction.receiverPhone})</p>
      <p>Montant : ${updatedTransaction.amountSent} ${updatedTransaction.currencySent} (Envoyé) / ${updatedTransaction.amountReceived} ${updatedTransaction.currencyReceived} (Reçu)</p>
      <p>Merci pour votre patience.</p>
    `;

    if (updatedTransaction.senderEmail) {
      await sendEmail({
        email: updatedTransaction.senderEmail,
        subject: emailSubject,
        html: emailHtml,
        text: `Votre transfert Réf: ${updatedTransaction.transactionRef} est maintenant ${updatedTransaction.status}.`
      });
    }
    if (updatedTransaction.receiverEmail) {
      await sendEmail({
        email: updatedTransaction.receiverEmail,
        subject: `Transfert MboaConnect Reçu - Réf: ${updatedTransaction.transactionRef}`,
        html: `
            <p>Cher(e) ${updatedTransaction.receiverName},</p>
            <p>Un transfert avec la référence <strong>${updatedTransaction.transactionRef}</strong> pour ${updatedTransaction.amountReceived} ${updatedTransaction.currencyReceived} a été ${updatedTransaction.status}.</p>
            <p>Expéditeur : ${updatedTransaction.senderName}.</p>
            <p>Veuillez vérifier votre compte.</p>
        `,
        text: `Transfert Réf: ${updatedTransaction.transactionRef} pour ${updatedTransaction.amountReceived} ${updatedTransaction.currencyReceived} a été ${updatedTransaction.status}.`
      });
    }


    res.json(updatedTransaction);
  } catch (error) {
    console.error('Erreur dans updateTransactionStatus :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut de la transaction' });
  }
};

module.exports = {
  sendMoney,
  getTransactions,
  getTransactionByRef,
  updateTransactionStatus,
};
