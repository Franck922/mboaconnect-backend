// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { User } = require('../models');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Vérifie si l'en-tête d'autorisation est présent et commence par 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extrait le token de l'en-tête
      token = req.headers.authorization.split(' ')[1];

      // Vérifie si le token est une chaîne non vide ou des valeurs indésirables
      if (!token || token === 'null' || token === 'undefined') {
        const error = new Error('Non autorisé, token vide ou malformé');
        error.statusCode = 401;
        throw error;
      }

      // Vérifie le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Trouve l'utilisateur par l'ID décodé et exclut les champs sensibles
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password', 'refreshToken'] }
      });

      // Si l'utilisateur n'est pas trouvé, le token est invalide
      if (!req.user) {
        const error = new Error('Utilisateur non trouvé, token invalide');
        error.statusCode = 401;
        throw error;
      }

      // Passe au middleware suivant
      next();
    } catch (error) {
      console.error('Erreur de token dans protect middleware :', error.message);
      
      // Log le token si c'est une erreur de format JWT
      if (error.name === 'JsonWebTokenError' && token) {
        console.error('Token malformé ou invalide reçu:', token);
      }

      let statusCode = 401; // Par défaut, non autorisé

      // Messages d'erreur spécifiques pour une meilleure clarté
      if (error.name === 'TokenExpiredError') {
        error.message = 'Non autorisé, token expiré';
      } else if (error.name === 'JsonWebTokenError') {
        error.message = 'Non autorisé, token invalide';
      } else {
        error.message = 'Non autorisé, token invalide ou expiré'; // Message générique pour d'autres erreurs JWT
      }
      
      error.statusCode = statusCode;
      throw error; // Propager l'erreur au gestionnaire d'erreurs Express
    }
  } else {
    // Si aucun en-tête d'autorisation ou format incorrect
    const error = new Error('Non autorisé, pas de token fourni dans l\'en-tête');
    error.statusCode = 401;
    throw error;
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next(); // L'utilisateur est un admin, passe au middleware suivant
  } else {
    const error = new Error('Non autorisé en tant qu\'administrateur');
    error.statusCode = 403; // 403 Forbidden
    throw error;
  }
};

module.exports = { protect, admin };
