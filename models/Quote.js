// backend/models/quote.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => { // <-- MODIFIÉ : Exportation comme une fonction
  const Quote = sequelize.define('Quote', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: { // If the request is made by a registered user
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users', // Assurez-vous que c'est le nom de la table des utilisateurs
        key: 'id',
      }
    },
    clientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    clientEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      }
    },
    clientPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceType: {
      type: DataTypes.STRING, // E.g., 'Installation Caméras', 'Kit Alarme', 'Maintenance'
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT, // Detailed description of the request
      allowNull: false,
    },
    preferredDate: { // Preferred appointment date
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'reviewed', 'approved', 'rejected', 'completed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    adminNotes: { // Notes from the administrator
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // Estimated cost after review
    },
  }, {
    tableName: 'quotes', // Explicitly setting the table name
    timestamps: true, // Assurez-vous que les timestamps sont gérés
  });

  return Quote; // <-- MODIFIÉ : Retourne le modèle défini
};
