// routes/transferRoutes.js
const express = require('express');
const {
  sendMoney,
  getTransactions,
  getTransactionByRef,
  updateTransactionStatus,
} = require('../controllers/transferController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes pour les transferts d'argent

// Envoyer de l'argent (Public pour permettre des transferts par des non-utilisateurs enregistrés, ou protect si seulement les utilisateurs connectés)
// Pour l'instant, on le laisse en public comme suggéré par le contrôleur (expéditeur/récepteur peuvent être anonymes)
// POST /api/transfers/send
router.post('/send', sendMoney);

// Obtenir l'historique des transactions (Admin pour tous, Utilisateur pour les siennes)
// GET /api/transfers
router.get('/', protect, getTransactions);

// Obtenir une transaction par numéro de référence (Public pour le suivi, ou protégé si un token est requis)
// GET /api/transfers/:ref
router.get('/:ref', getTransactionByRef); // Peut être protect, si vous voulez que seuls les utilisateurs connectés (admin ou participant) puissent suivre

// Mettre à jour le statut d'une transaction (Admin seulement)
// PUT /api/transfers/:id/status
router.put('/:id/status', protect, admin, updateTransactionStatus);

module.exports = router;
