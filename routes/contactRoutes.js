// backend/routes/contactRoutes.js
const express = require('express');
const { submitContactForm } = require('../controllers/contactController');

const router = express.Router();

// Route pour soumettre le formulaire de contact
// POST /api/contact
router.post('/', submitContactForm); // La route est juste '/', car elle sera préfixée par '/api/contact' dans server.js

module.exports = router;
