// backend/models/transaction.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => { // <-- MODIFIÉ : Exportation comme une fonction
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    senderName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    senderEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      }
    },
    senderPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receiverName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receiverEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      }
    },
    receiverPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amountSent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currencySent: {
      type: DataTypes.STRING(3), // E.g., 'XAF', 'EUR', 'USD'
      allowNull: false,
    },
    amountReceived: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currencyReceived: {
      type: DataTypes.STRING(3), // E.g., 'XAF'
      allowNull: false,
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 4), // Exchange rate (e.g., 1 EUR = 655.957 XAF)
      allowNull: false,
    },
    fees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
    },
    transactionRef: { // Unique reference number for tracking
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
  }, {
    tableName: 'transactions', // Explicitly setting the table name
    timestamps: true, // Ajoutez timestamps si vous voulez createdAt et updatedAt
  });

  return Transaction; // <-- MODIFIÉ : Retourne le modèle défini
};
