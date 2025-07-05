// backend/controllers/authController.js
const asyncHandler = require('express-async-handler');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Fonction utilitaire pour générer les tokens (Access et Refresh)
const generateTokens = (id, isAdmin) => {
  const accessToken = jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
};

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phoneNumber, password, address, city, country } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Veuillez entrer tous les champs obligatoires (Nom, Prénom, Email, Mot de passe).');
  }

  const userExists = await User.findOne({ where: { email } });
  if (userExists) {
    res.status(400);
    throw new Error('L\'utilisateur existe déjà avec cet email.');
  }

  // Le hachage du mot de passe est géré par le hook `beforeCreate` dans le modèle User.
  const user = await User.create({
    firstName,
    lastName,
    email,
    phoneNumber,
    password, // Le hook beforeCreate hachera le mot de passe
    address,
    city,
    country,
    isAdmin: false,
  });

  if (user) {
    const { accessToken, refreshToken } = generateTokens(user.id, user.isAdmin);

    // Stocker le refresh token brut dans la base de données
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
      accessToken,
      refreshToken,
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides.');
  }
});

// @desc    Authentifier l'utilisateur et obtenir le token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt for email:', email); // LOG 1

  if (!email || !password) {
    res.status(400);
    throw new Error('Veuillez entrer l\'email et le mot de passe.');
  }

  console.log('Searching for user in DB with email:', email); // LOG 2
  const user = await User.findOne({ where: { email } });
  console.log('User found:', user ? user.email : 'None'); // LOG 3

  if (!user) {
    res.status(401);
    throw new Error('Email ou mot de passe invalide.');
  }

  console.log('Comparing passwords for user:', user.email); // LOG 4
  const isMatch = await user.matchPassword(password);
  console.log('Password match result (authController):', isMatch); // LOG 5

  if (!isMatch) {
    res.status(401);
    throw new Error('Email ou mot de passe invalide.');
  }

  console.log('Generating tokens for user:', user.email); // LOG 6
  const { accessToken, refreshToken } = generateTokens(user.id, user.isAdmin);

  console.log('Saving refresh token to DB for user:', user.email); // LOG 7
  user.refreshToken = refreshToken;
  await user.save();
  console.log('Refresh token saved.'); // LOG 8

  res.status(200).json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    isAdmin: user.isAdmin,
    accessToken,
    refreshToken,
  });
  console.log('Login successful, response sent for:', user.email); // LOG 9
});

// @desc    Rafraîchir l'access token en utilisant le refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(401);
    throw new Error('Refresh token manquant.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findByPk(decoded.id);

    if (!user || !user.refreshToken) {
      res.status(403);
      throw new Error('Refresh token invalide ou utilisateur introuvable.');
    }

    if (user.refreshToken !== refreshToken) {
      res.status(403);
      throw new Error('Refresh token invalide.');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.isAdmin);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error.message);
    if (error.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error('Refresh token expiré. Veuillez vous reconnecter.');
    }
    res.status(403);
    throw new Error('Refresh token invalide ou erreur serveur.');
  }
});

// @desc    Déconnecter l'utilisateur (invalider le refresh token)
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    res.status(401);
    throw new Error('Non autorisé: Utilisateur non identifié.');
  }

  const user = await User.findByPk(req.user.id);

  if (user) {
    user.refreshToken = null;
    await user.save();
    res.status(200).json({ message: 'Déconnexion réussie.' });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé.');
  }
});

// @desc    Obtenir le profil de l'utilisateur
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });

  if (user) {
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      city: user.city,
      country: user.country,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
};
