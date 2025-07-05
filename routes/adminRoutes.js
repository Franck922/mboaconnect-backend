// backend/routes/adminRoutes.js
const express = require('express');
// Assurez-vous que le chemin est correct pour vos middlewares d'authentification
const { protect, admin } = require('../middleware/authMiddleware'); 
// Assurez-vous que le chemin est correct pour votre contrôleur
const { getDashboardOverview } = require('../controllers/adminController'); 

const router = express.Router();

/**
 * @desc    Route pour récupérer les statistiques globales du tableau de bord
 * @route   GET /api/admin/stats/overview
 * @access  Private/Admin
 *
 * Cette route est protégée et n'est accessible qu'aux administrateurs.
 */
router.get('/stats/overview', protect, admin, getDashboardOverview);

module.exports = router;
