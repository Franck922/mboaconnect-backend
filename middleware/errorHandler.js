// middleware/errorHandler.js

// Gère les erreurs spécifiques pour les routes non trouvées (404)
const notFound = (req, res, next) => {
  const error = new Error(`Non trouvé - ${req.originalUrl}`);
  res.status(404);
  next(error); // Passe l'erreur au middleware de gestion des erreurs général
};

// Gère toutes les autres erreurs
const errorHandler = (err, req, res, next) => {
  // Si le statut de la réponse est déjà défini comme 200 (succès), le transformer en 500
  // C'est utile pour les erreurs asynchrones qui peuvent ne pas définir explicitement un statut.
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  res.json({
    message: err.message, // Message d'erreur
    // Afficher la stack trace en mode développement pour le débogage
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};