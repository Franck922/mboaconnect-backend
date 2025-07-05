// utils/jwt.js
const jwt = require('jsonwebtoken');

// Fonction pour générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Le token expirera après 30 jours
  });
};

module.exports = generateToken;