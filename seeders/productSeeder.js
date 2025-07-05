// backend/seeders/productSeeder.js

// Assurez-vous d'importer le modèle Product, Order, OrderItem, Transaction et l'instance sequelize
// Nous importons également User car nous voulons créer un utilisateur admin
const { sequelize, Product, Order, OrderItem, Transaction, User } = require('../models');
const bcrypt = require('bcryptjs'); // Pour hacher le mot de passe de l'utilisateur admin

// Données des produits cosmétiques à insérer avec de VRAIES URL d'images
const productsData = [
  {
    name: "Sérum Hydratant Lumière Éclat",
    description: "Un sérum léger enrichi en acide hyaluronique et vitamine C pour une hydratation intense, un teint lumineux et une protection antioxydante. Convient à tous les types de peau, même sensibles.",
    price: 38.99,
    stock: 50,
    category: "Soin Visage",
    imageUrl: "https://images.unsplash.com/photo-1631548684223-9c76e2c1c3f2?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Crème Nuit Réparatrice Anti-Âge",
    description: "Crème riche et veloutée qui agit pendant votre sommeil pour stimuler la régénération cellulaire, réduire les rides et restaurer la fermeté de la peau. Aux peptides et rétinol doux.",
    price: 45.75,
    stock: 30,
    category: "Soin Visage",
    imageUrl: "https://images.unsplash.com/photo-1620240742517-578d8f997233?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Nettoyant Moussant Purifiant",
    description: "Une mousse onctueuse qui nettoie en profondeur, élimine les impuretés et l'excès de sébum sans dessécher la peau. Idéale pour les peaux mixtes à grasses. Au thé vert et zinc.",
    price: 21.00,
    stock: 70,
    category: "Nettoyant",
    imageUrl: "https://images.unsplash.com/photo-1622393399477-94d07010f37c?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Lait Corporel Ultra-Nourrissant",
    description: "Formule enrichie en beurre de karité et huiles végétales, pour nourrir intensément les peaux très sèches et sensibles. Laisse la peau douce, souple et délicatement parfumée.",
    price: 28.50,
    stock: 60,
    category: "Soin Corps",
    imageUrl: "https://images.unsplash.com/photo-1616788876616-a337580622a5?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Baume à Lèvres Teinté Hydratant SPF20",
    description: "Un baume qui hydrate et protège vos lèvres avec un indice SPF20, tout en leur apportant une touche de couleur naturelle. Disponible en plusieurs teintes.",
    price: 15.99,
    stock: 80,
    category: "Maquillage",
    imageUrl: "https://images.unsplash.com/photo-1601007604561-3444434220b3?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    name: "Protection Solaire Visage Minérale SPF 50+",
    description: "Crème solaire visage à filtre minéral, idéale pour les peaux sensibles. Très haute protection UVA/UVB, formule non comédogène, résistante à l'eau.",
    price: 32.00,
    stock: 45,
    category: "Protection Solaire",
    imageUrl: "https://images.unsplash.com/photo-1629837943444-2451f28b2ae3?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
];

const seedProducts = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie pour le seeding.');

    // --- DÉSACTIVER LES VÉRIFICATIONS DE CLÉS ÉTRANGÈRES ---
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true });
    console.log('Vérifications de clés étrangères désactivées.');

    // --- ORDRE DE SUPPRESSION POUR UNE RÉINITIALISATION COMPLÈTE ---
    await OrderItem.destroy({ truncate: true, cascade: true });
    console.log('Anciens OrderItems supprimés.');

    await Order.destroy({ truncate: true, cascade: true });
    console.log('Anciennes Orders supprimées.');

    await Transaction.destroy({ truncate: true, cascade: true });
    console.log('Anciennes Transactions supprimées.');

    await Product.destroy({ truncate: true, cascade: true });
    console.log('Anciens produits supprimés de la base de données.');

    // Vider la table des utilisateurs en dernier pour s'assurer que toutes les dépendances sont gérées
    await User.destroy({ truncate: true, cascade: true });
    console.log('Anciens Utilisateurs supprimés.');

    // --- RÉACTIVER LES VÉRIFICATIONS DE CLÉS ÉTRANGÈRES ---
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', null, { raw: true });
    console.log('Vérifications de clés étrangères réactivées.');

    // --- INSÉRER LES NOUVELLES DONNÉES ---

    // 1. Insérer un utilisateur administrateur par défaut
    const adminPassword = 'adminpassword'; // Mot de passe par défaut pour l'admin
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: hashedAdminPassword,
      phoneNumber: '670000000',
      isAdmin: true,
      address: '123 Admin St',
      city: 'Douala',
      country: 'Cameroon',
      // refreshToken sera null initialement, généré à la connexion
    });
    console.log('Utilisateur admin par défaut créé (admin@example.com / adminpassword).');

    // 2. Insérer les produits
    await Product.bulkCreate(productsData);
    console.log(`${productsData.length} produits insérés avec succès.`);

  } catch (error) {
    console.error('Erreur lors du seeding des produits:', error);
  } finally {
    // Fermer la connexion à la base de données une fois le seeding terminé
    await sequelize.close();
    console.log('Connexion à la base de données fermée.');
  }
};

// Exécute le seeder lorsque le script est appelé directement
seedProducts();
