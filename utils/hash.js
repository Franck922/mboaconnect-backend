// utils/hash.js
const bcrypt = require('bcryptjs');

// Fonction pour hacher un mot de passe
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10); // Génère un salt avec 10 rounds
  return bcrypt.hash(password, salt); // Hache le mot de passe
};

// Fonction pour comparer un mot de passe non haché avec un mot de passe haché
const comparePassword = async (enteredPassword, hashedPassword) => {
  return bcrypt.compare(enteredPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};