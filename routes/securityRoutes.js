// backend/routes/securityRoutes.js
const express = require('express');
const {
  createQuoteRequest,
  getAllQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  getMyQuotes,
} = require('../controllers/securityController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assurez-vous que 'admin' est importé comme cela ou 'authorize'

const router = express.Router();

// Routes pour les demandes de devis de systèmes de sécurité

// Créer une nouvelle demande de devis (MAINTENANT Protégé)
// POST /api/security/quotes
router.post('/quotes', protect, createQuoteRequest); // <--- MODIFIÉ : AJOUT DE 'protect' ICI

// Obtenir toutes les demandes de devis (Admin seulement)
// GET /api/security/quotes
router.get('/quotes', protect, admin, getAllQuotes);

// Obtenir une demande de devis par ID (Admin ou l'utilisateur qui l'a soumise)
// GET /api/security/quotes/:id
router.get('/quotes/:id', protect, getQuoteById);

// Route pour récupérer les devis de l'utilisateur actuel (Authentifié)
// GET /api/security/myquotes
router.get('/myquotes', protect, getMyQuotes);

// Mettre à jour une demande de devis (Admin seulement)
// PUT /api/security/quotes/:id
router.put('/quotes/:id', protect, admin, updateQuote);

// Supprimer une demande de devis (Admin seulement)
// DELETE /api/security/quotes/:id
router.delete('/quotes/:id', protect, admin, deleteQuote);

module.exports = router;
