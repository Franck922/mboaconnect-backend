// routes/productRoutes.js
const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes pour les produits

// Récupérer tous les produits (Public)
// GET /api/products
router.get('/', getProducts);

// Récupérer un produit par ID (Public)
// GET /api/products/:id
router.get('/:id', getProductById);

// Créer un nouveau produit (Admin seulement)
// POST /api/products
router.post('/', protect, admin, createProduct);

// Mettre à jour un produit existant (Admin seulement)
// PUT /api/products/:id
router.put('/:id', protect, admin, updateProduct);

// Supprimer un produit (Admin seulement)
// DELETE /api/products/:id
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;    