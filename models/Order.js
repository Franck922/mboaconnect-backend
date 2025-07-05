// backend/models/order.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => { // <-- MODIFIÉ : Exportation comme une fonction
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // Refers to the 'users' table
        key: 'id',
      }
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'), // Possible order statuses
      defaultValue: 'pending',
      allowNull: false,
    },
    shippingAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING, // E.g., 'Mobile Money', 'PayPal', 'Credit Card'
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    // Fields specific to international orders
    isInternational: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    shippingFees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    shippingCountryCode: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'orders', // Explicitly setting the table name
    timestamps: true, // Ajoutez timestamps si vous voulez createdAt et updatedAt
  });

  return Order; // <-- MODIFIÉ : Retourne le modèle défini
};
