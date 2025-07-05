// controllers/userController.js
const { User } = require('../models'); // Assurez-vous que le chemin est correct pour votre modèle Sequelize
const { hashPassword } = require('../utils/hash'); // Assurez-vous que le chemin est correct pour votre utilitaire de hachage
const generateToken = require('../utils/jwt'); // Assurez-vous que le chemin est correct pour votre utilitaire de JWT

// @desc    Obtenir le profil utilisateur (pour l'utilisateur authentifié lui-même)
// @route   GET /api/users/profile
// @access  Private (accessible pour tout utilisateur authentifié)
const getUserProfile = async (req, res) => {
  try {
    // `req.user` est attaché par votre middleware `protect`
    // Dans Sequelize, l'ID de l'utilisateur est souvent `req.user.id` (et non `_id` de MongoDB)
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // Exclure le mot de passe pour la sécurité
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
        // N'oubliez pas de renvoyer un nouveau token si c'est pertinent après une récupération,
        // bien que la récupération de profil ne change pas le token par défaut.
        // Ici, je ne le génère pas car le token est déjà vérifié par le middleware.
      });
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans getUserProfile :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du profil utilisateur' });
  }
};


// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] } // Exclure les mots de passe pour la sécurité
    });
    res.json(users);
  } catch (error) {
    console.error('Erreur dans getUsers :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
};

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans getUserById :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur par ID' });
  }
};

// @desc    Mettre à jour le profil utilisateur (pour l'utilisateur authentifié lui-même)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id); // `req.user` provient du middleware `protect`

    if (user) {
      user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
      user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;
      user.email = req.body.email !== undefined ? req.body.email : user.email;
      user.phoneNumber = req.body.phoneNumber !== undefined ? req.body.phoneNumber : user.phoneNumber;
      user.address = req.body.address !== undefined ? req.body.address : user.address;
      user.city = req.body.city !== undefined ? req.body.city : user.city;
      user.country = req.body.country !== undefined ? req.body.country : user.country;

      if (req.body.password) {
        user.password = await hashPassword(req.body.password);
      }

      const updatedUser = await user.save();

      res.json({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        city: updatedUser.city,
        country: updatedUser.country,
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser.id), // Générer un nouveau token si les données utilisateur ont pu changer
      });
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans updateUserProfile :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil utilisateur' });
  }
};

// @desc    Mettre à jour n'importe quel utilisateur (Admin seulement)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (user) {
            user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
            user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;
            user.email = req.body.email !== undefined ? req.body.email : user.email;
            user.phoneNumber = req.body.phoneNumber !== undefined ? req.body.phoneNumber : user.phoneNumber;
            user.address = req.body.address !== undefined ? req.body.address : user.address;
            user.city = req.body.city !== undefined ? req.body.city : user.city;
            user.country = req.body.country !== undefined ? req.body.country : user.country;
            user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

            if (req.body.password) {
                user.password = await hashPassword(req.body.password);
            }

            const updatedUser = await user.save();
            res.json({
                id: updatedUser.id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                isAdmin: updatedUser.isAdmin,
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('Erreur dans updateUser (Admin) :', error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur' });
    }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (user) {
      await user.destroy(); // Supprime l'utilisateur de la base de données
      res.json({ message: 'Utilisateur supprimé avec succès' });
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans deleteUser :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserProfile,
  updateUser,
  deleteUser,
  getUserProfile, // <--- C'EST LA CLÉ : AJOUTEZ CETTE LIGNE À L'EXPORT
};
