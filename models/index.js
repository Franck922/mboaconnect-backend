// backend/models/index.js
console.log('--- Loading models/index.js ---');
const { Sequelize, DataTypes } = require('sequelize'); // Importez DataTypes aussi
const dotenv = require('dotenv'); // Importez dotenv pour charger les variables d'environnement

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données à partir des variables d'environnement
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql', // Assurez-vous que c'est bien 'mysql' ou le dialecte que vous utilisez
    logging: false, // Désactiver le logging SQL pour des logs plus propres
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importez et initialisez tous les modèles en leur passant l'instance sequelize
db.User = require('./user')(sequelize);
db.Product = require('./product')(sequelize);
db.Order = require('./order')(sequelize);
db.OrderItem = require('./orderItem')(sequelize);
db.Transaction = require('./transaction')(sequelize);
db.Quote = require('./quote')(sequelize);

// Définir les associations
db.User.hasMany(db.Order, { foreignKey: 'userId', as: 'orders' });
db.Order.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.Order.hasMany(db.OrderItem, { foreignKey: 'orderId', as: 'orderItems', onDelete: 'CASCADE' });
db.OrderItem.belongsTo(db.Order, { foreignKey: 'orderId', as: 'order' });

db.Product.hasMany(db.OrderItem, { foreignKey: 'productId', as: 'orderItems' });
db.OrderItem.belongsTo(db.Product, { foreignKey: 'productId', as: 'product' });

db.User.hasMany(db.Quote, { foreignKey: 'userId', as: 'quotes' });
db.Quote.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

module.exports = db;
