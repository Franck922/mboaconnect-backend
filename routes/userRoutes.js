// routes/userRoutes.js
const express = require('express');
const {
  getUsers,
  getUserById,
  updateUserProfile,
  updateUser,
  deleteUser,
  getUserProfile, // <--- Assurez-vous que ceci est bien importé de userController
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware'); // Importe les middlewares

const router = express.Router();

// Récupérer tous les utilisateurs (Admin seulement)
router.get('/', protect, admin, getUsers);

// Récupérer le profil de l'utilisateur authentifié
router.get('/profile', protect, getUserProfile); // <--- Cette ligne est correcte

// Mettre à jour le profil de l'utilisateur authentifié
router.put('/profile', protect, updateUserProfile);

// Récupérer un utilisateur par ID (Admin seulement)
router.get('/:id', protect, admin, getUserById);

// Mettre à jour un utilisateur par ID (Admin seulement)
router.put('/:id', protect, admin, updateUser);

// Supprimer un utilisateur par ID (Admin seulement)
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
