// routes/orderRoutes.js
const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderInvoice,
  
  // NOUVEAU : Importer la fonction updatePaymentStatus (assurez-vous qu'elle est exportée par orderController)
  updatePaymentStatus,
} = require('../controllers/orderController');

const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes pour les commandes

// Créer une nouvelle commande (Utilisateur authentifié)
// POST /api/orders
router.post('/', protect, createOrder);

// Obtenir toutes les commandes de l'utilisateur authentifié
// GET /api/orders/myorders
router.get('/myorders', protect, getMyOrders);

// Obtenir toutes les commandes (Admin seulement) - doit être avant /:id pour éviter les conflits
// GET /api/orders
router.get('/', protect, admin, getAllOrders);

// Obtenir une commande par ID (Propriétaire de la commande ou Admin)
// GET /api/orders/:id
router.get('/:id', protect, getOrderById);

// Mettre à jour le statut d'une commande (Admin seulement)
// PUT /api/orders/:id/status
router.put('/:id/status', protect, admin, updateOrderStatus);

// NOUVEAU : Route pour mettre à jour le statut de paiement d'une commande
// Cette route est essentielle pour la simulation de paiement ou les webhooks.
// PUT /api/orders/:id/pay
router.put('/:id/pay', protect, admin, updatePaymentStatus); // Ajout de la route

// Générer et télécharger une facture PDF pour une commande (Propriétaire de la commande ou Admin)
// GET /api/orders/:id/invoice
router.get('/:id/invoice', protect, getOrderInvoice);


module.exports = router;
