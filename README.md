# MboaConnect · API

API REST qui porte la boutique, les devis, les commandes et les transferts de MboaConnect.
Écrite en Node.js avec Express 5 et Sequelize sur MySQL.

## Ce que l'API expose

| Domaine | Ce qu'il fait |
|---|---|
| Authentification | Inscription, connexion, jeton JWT signé, mot de passe haché avec bcrypt |
| Produits | Catalogue, fiche produit, jeu de données de démonstration via un seeder |
| Commandes | Panier validé, lignes de commande, suivi du statut |
| Devis | Demande de devis par le client, traitement côté administration |
| Transferts | Enregistrement et suivi des transferts |
| Contact | Formulaire de contact relayé par courriel |
| Administration | Gestion des utilisateurs, des produits, des commandes, des devis et des transferts |
| Sécurité | Points d'entrée dédiés aux opérations sensibles du compte |

## Choix techniques

**Découpage en couches.** Les routes déclarent les points d'entrée, les contrôleurs orchestrent,
les modèles Sequelize portent la persistance. Rien de métier ne vit dans une route.

**Sécurité des requêtes.** Helmet pose les en-têtes HTTP de protection,
`express-rate-limit` freine les tentatives répétées sur les points d'entrée d'authentification,
CORS est restreint aux origines attendues. Les mots de passe passent par bcrypt,
jamais stockés en clair.

**Autorisation.** Un intergiciel vérifie le jeton et le rôle avant d'atteindre le contrôleur,
donc un appel direct à une route d'administration échoue même si l'interface ne l'affiche pas.

**Gestion des erreurs.** Un gestionnaire central renvoie un format de réponse uniforme,
et `express-async-handler` évite les blocs try/catch répétés dans chaque contrôleur.

**Documents et courriels.** PDFKit produit les devis et les justificatifs,
Nodemailer se charge de l'envoi.

## Structure

```
config/        connexion à la base
controllers/   logique de chaque domaine
middleware/    authentification, gestion des erreurs
models/        entités Sequelize et leurs relations
routes/        déclaration des points d'entrée
seeders/       jeu de données de démonstration
utils/         hachage, jetons, courriels, génération de PDF
server.js      point d'entrée
```

## Lancer en local

```bash
npm install
cp .env.example .env    # renseigner la base de données et le secret JWT
node seeders/productSeeder.js
npm start
```

Variables attendues dans `.env` : accès MySQL, secret de signature des jetons,
paramètres du serveur de courriel.

## Application mobile

Le client qui consomme cette API est ici : [mboaconnect-expo-frontend](https://github.com/Franck922/mboaconnect-expo-frontend).

---

Franck DEFFO · [Portfolio](https://franck922.github.io/Franck-DEFFO-.github.io/) · [LinkedIn](https://www.linkedin.com/in/franck-deffo)
