// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importe l'instance sequelize et les modèles
const { sequelize } = require('./models');

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Middleware pour parser le JSON des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: false })); 

// Middleware CORS pour permettre les requêtes cross-origin
app.use(cors());

// Middleware Helmet pour définir des en-têtes HTTP sécurisés
app.use(helmet());

// --- Configuration de la limitation de taux (Rate Limiting) ---

// Limiteur de taux général pour la plupart des requêtes API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limite chaque IP à 10000 requêtes par fenêtre de 15 minutes (pour le développement)
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur de taux plus strict pour les routes d'authentification (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite chaque IP à 10 tentatives par fenêtre de 15 minutes pour les routes d'auth
  message: 'Trop de tentatives de connexion/inscription depuis cette adresse IP, veuillez réessayer après 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); // CORRIGÉ ICI
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const securityRoutes = require('./routes/securityRoutes');
const transferRoutes = require('./routes/transferRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Importez la route admin


// L'ORDRE EST CRUCIAL :
// 1. Appliquer le limiteur d'authentification et les routes d'authentification en premier.
app.use('/api/auth', authLimiter, authRoutes);

// 2. Ensuite, appliquer le limiteur général aux AUTRES routes API.
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/security', apiLimiter, securityRoutes);
app.use('/api/transfers', apiLimiter, transferRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/admin', adminRoutes); // Toutes les routes admin commenceront par /api/admin


// Route de base (simple vérification que l'API est en ligne)
app.get('/', (req, res) => {
  res.send('API MboaConnect est en cours d\'exécution...');
});

// Gérer les routes non trouvées (middleware final pour les 404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Non trouvé - ' + req.originalUrl });
});

// Middleware de gestion des erreurs (centralisé pour toutes les erreurs)
app.use((err, req, res, next) => {
  console.error(err.stack); // Log l'erreur complète pour le débogage
  res.status(err.statusCode || 500).json({
    message: err.message || 'Erreur serveur interne',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Connexion à la base de données et démarrage du serveur
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('Connexion à la base de données MySQL établie avec succès.');
    // ATTENTION : Pour le développement UNIQUEMENT.
    // sequelize.sync() est utile pour créer/mettre à jour les tables en développement,
    // mais n'est PAS recommandé en production. Utilisez des migrations pour la production.
    // Pour résoudre l'erreur "Too many keys", nous commentons cette ligne.
    /*
    return sequelize.sync({ alter: true });
    */
  })
  .then(() => { // Ce .then() s'exécutera toujours après sequelize.authenticate()
    console.log('Modèles Sequelize synchronisés avec la base de données. (Si sequelize.sync() est activé)');
    app.listen(PORT, () => {
      console.log(`Serveur MboaConnect en cours d'exécution sur le port ${PORT} en mode ${process.env.NODE_ENV}`);
    });
  })
  .catch(err => {
    console.error('Impossible de se connecter à la base de données ou de synchroniser les modèles :', err);
    process.exit(1);
  });

module.exports = app;
