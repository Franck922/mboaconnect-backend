// backend/models/orderItem.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => { // <-- MODIFIÉ : Exportation comme une fonction
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders', // Refers to the 'orders' table
        key: 'id',
      }
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products', // Refers to the 'products' table
        key: 'id',
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: { // Price of the product at the time of order (might differ from current product price)
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  }, {
    tableName: 'order_items', // Explicitly setting the table name
    timestamps: true, // Ajoutez timestamps si vous voulez createdAt et updatedAt
  });

  return OrderItem; // <-- MODIFIÉ : Retourne le modèle défini
};
