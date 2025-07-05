// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Importe le middleware de protection

// Routes publiques (pas de protection par token)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshAccessToken);

// Routes privées (nécessitent un token valide)
// Le middleware 'protect' est appliqué UNIQUEMENT à ces routes
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
    