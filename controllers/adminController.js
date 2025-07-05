// backend/controllers/adminController.js
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize'); // Importez Op pour les opérateurs de requête

// MODIFIÉ: Importation des modèles via déstructuration depuis l'index des modèles
// Utilise 'Quote' et 'Transaction' pour correspondre aux noms exportés dans models/index.js
const { User, Order, Product, Quote, Transaction, sequelize } = require('../models');

/**
 * @desc    Récupérer les statistiques globales du tableau de bord administrateur
 * @route   GET /api/admin/stats/overview
 * @access  Private/Admin
 *
 * Cette fonction agrège diverses données de la base de données pour fournir un aperçu
 * rapide à l'administrateur.
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
  try {
    // Calculer le nombre total d'utilisateurs
    const totalUsers = await User.count();

    // Calculer le nombre total de produits
    const totalProducts = await Product.count();

    // Calculer le nombre total de commandes
    const totalOrders = await Order.count();

    // Calculer le nombre de commandes en attente
    const pendingOrders = await Order.count({
      where: { status: 'pending' }, // Adaptez 'status' et sa valeur selon la définition de votre modèle Order
    });

    // Calculer le nombre de demandes de devis en attente
    // Utilise 'Quote' tel qu'importé
    const pendingQuotes = await Quote.count({
      where: { status: 'pending' }, // Adaptez le statut selon votre modèle Quote
    });

    // Calculer le nombre total de transferts
    // Utilise 'Transaction' tel qu'importé
    const totalTransfers = await Transaction.count();

    // Calculer le montant total des ventes récentes (ex: commandes complétées ou livrées)
    const recentSalesValue = await Order.sum('totalAmount', {
      where: {
        paymentStatus: 'completed', // Considérez les ventes comme complétées si le paiement est terminé
        // Optionnel: Filtrer par date, par exemple les 30 derniers jours
        // createdAt: {
        //   [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Il y a 30 jours
        // }
      },
    });

    // Envoyer les statistiques agrégées
    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      pendingQuotes,
      totalTransfers,
      recentSalesValue: recentSalesValue || 0, // S'assurer que la valeur est 0 si aucune vente
    });

  } catch (error) {
    console.error('Erreur dans getDashboardOverview:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques du tableau de bord.' });
  }
});

module.exports = {
  getDashboardOverview,
};
