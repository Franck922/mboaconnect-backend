// backend/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    refreshToken: {
      type: DataTypes.STRING, // Stocke le refresh token brut
      allowNull: true,
    },
  }, {
    timestamps: true,
  });

  // Hook Sequelize pour hacher le mot de passe avant de créer/mettre à jour un utilisateur
  User.beforeCreate(async (user) => {
    if (user.password) {
      console.log('User model: Hashing password before creation...');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      console.log('User model: Password hashed.');
    }
  });

  // Méthode d'instance pour comparer les mots de passe
  User.prototype.matchPassword = async function (enteredPassword) {
    console.log('User model: Attempting to match password. Entered password length:', enteredPassword ? enteredPassword.length : 'null', 'Stored hashed password length:', this.password ? this.password.length : 'null'); // LOG 10
    const match = await bcrypt.compare(enteredPassword, this.password);
    console.log('User model: Password match result (bcrypt):', match); // LOG 11
    return match;
  };

  return User;
};
