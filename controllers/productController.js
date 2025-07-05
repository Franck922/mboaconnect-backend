// controllers/productController.js
const { Product } = require('../models');

// @desc    Obtenir tous les produits
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error('Erreur dans getProducts :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des produits' });
  }
};

// @desc    Obtenir un seul produit par ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans getProductById :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du produit par ID' });
  }
};

// @desc    Créer un nouveau produit
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  const { name, description, price, category, imageUrl, stock } = req.body;

  // Validation basique
  if (!name || !price || !category) {
    return res.status(400).json({ message: 'Veuillez fournir un nom, un prix et une catégorie pour le produit' });
  }

  try {
    const product = await Product.create({
      name,
      description,
      price,
      category,
      imageUrl,
      stock,
    });
    res.status(201).json(product); // 201 Créé
  } catch (error) {
    console.error('Erreur dans createProduct :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la création du produit' });
  }
};

// @desc    Mettre à jour un produit existant
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      // Mettre à jour les champs s'ils sont fournis, sinon conserver les valeurs existantes
      product.name = req.body.name !== undefined ? req.body.name : product.name;
      product.description = req.body.description !== undefined ? req.body.description : product.description;
      product.price = req.body.price !== undefined ? req.body.price : product.price;
      product.category = req.body.category !== undefined ? req.body.category : product.category;
      product.imageUrl = req.body.imageUrl !== undefined ? req.body.imageUrl : product.imageUrl;
      product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans updateProduct :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du produit' });
  }
};

// @desc    Supprimer un produit
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      await product.destroy();
      res.json({ message: 'Produit supprimé avec succès' });
    } else {
      res.status(404).json({ message: 'Produit non trouvé' });
    }
  } catch (error) {
    console.error('Erreur dans deleteProduct :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du produit' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};