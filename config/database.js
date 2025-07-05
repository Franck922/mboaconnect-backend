// config/database.js
require('dotenv').config(); // Charge les variables d'environnement
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,      // Nom de la base de données
  process.env.DB_USER,      // Nom d'utilisateur MySQL
  process.env.DB_PASSWORD,  // Mot de passe MySQL
  {
    host: process.env.DB_HOST, // Hôte de la base de données (ex: 'localhost')
    dialect: 'mysql',          // Type de base de données
    logging: false,            // Désactive le logging SQL dans la console (mettez true pour le débogage)
    define: {
      timestamps: true,        // Ajoute automatiquement createdAt et updatedAt à vos modèles
      underscored: true,       // Utilise snake_case pour les noms de colonnes générés automatiquement (ex: created_at)
    },
    pool: {
      max: 5,       // Nombre maximum de connexions dans le pool
      min: 0,       // Nombre minimum de connexions dans le pool
      acquire: 30000, // Temps maximum (ms) que le pool essaiera d'obtenir une connexion avant d'échouer
      idle: 10000,    // Temps maximum (ms) qu'une connexion peut être inactive avant d'être libérée
    },
  }
);

module.exports = sequelize;