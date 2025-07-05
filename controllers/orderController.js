        // backend/controllers/orderController.js
        const { Order, OrderItem, Product, User, sequelize } = require('../models'); // Importer tous les modèles nécessaires ET sequelize pour les transactions
        const { generateInvoicePDF } = require('../utils/pdfGenerator'); // Utilitaire pour la génération de PDF
        const sendEmail = require('../utils/mailer'); // Utilitaire pour l'envoi d'emails (pour confirmation client)
        const path = require('path'); // Module path de Node.js pour les chemins de fichiers
        const fs = require('fs').promises; // Système de fichiers de Node.js pour les opérations asynchrones

        // @desc    Créer une nouvelle commande
        // @route   POST /api/orders
        // @access  Private (nécessite un utilisateur authentifié)
        const createOrder = async (req, res) => {
          const { orderItems, shippingAddress, paymentMethod, isInternational, shippingFees, shippingCountryCode } = req.body;

          // Validation basique des données d'entrée
          if (!orderItems || orderItems.length === 0 || !shippingAddress) {
            console.log('Backend (createOrder): Validation échouée - Articles ou adresse manquants.');
            return res.status(400).json({ message: 'Veuillez ajouter des articles à la commande et fournir une adresse de livraison' });
          }
          // Validation pour shippingCountryCode si international
          if (isInternational && !shippingCountryCode) {
            return res.status(400).json({ message: 'Le code du pays de livraison est obligatoire pour les commandes internationales.' });
          }

          // Début de la transaction Sequelize pour garantir l'atomicité
          const t = await sequelize.transaction();
          let createdOrder = null; // Déclarer la variable pour la commande créée

          try {
            const userId = req.user.id; // L'ID de l'utilisateur authentifié (via protect middleware)
            let totalAmount = 0;
            const itemsForOrder = []; // Stockera les détails des articles après vérification du stock

            console.log('Backend (createOrder): Début de la transaction pour userId:', userId);
            console.log('Backend (createOrder): Articles reçus pour vérification:', orderItems);

            // Première passe : Vérifier le stock et calculer le montant total
            for (const item of orderItems) {
              const product = await Product.findByPk(item.productId, { transaction: t }); // Inclure la transaction
              if (!product) {
                // En cas de produit non trouvé, annuler la transaction et renvoyer une erreur
                await t.rollback();
                console.error(`Backend (createOrder): Produit introuvable avec l'ID: ${item.productId}. Annulation de la transaction.`);
                return res.status(404).json({ message: `Produit non trouvé : ID ${item.productId}` });
              }
              if (product.stock < item.quantity) {
                // En cas de stock insuffisant, annuler la transaction et renvoyer une erreur
                await t.rollback();
                console.error(`Backend (createOrder): Stock insuffisant pour le produit: ${product.name}. Disponible: ${product.stock}, Requis: ${item.quantity}. Annulation de la transaction.`);
                return res.status(400).json({ message: `Stock insuffisant pour le produit : ${product.name}. Disponible : ${product.stock}, Demande : ${item.quantity}` });
              }

              const itemPrice = parseFloat(product.price); // Assurez-vous que le prix est un nombre
              totalAmount += itemPrice * item.quantity;
              itemsForOrder.push({
                productId: item.productId, // Utiliser productId de l'item reçu
                quantity: item.quantity,
                price: itemPrice, // Enregistrer le prix du produit au moment de l'achat
              });
            }

            // Ajouter les frais de livraison pour les commandes internationales si applicable
            const finalShippingFees = shippingFees ? parseFloat(shippingFees) : 0;
            if (isInternational) {
              totalAmount += finalShippingFees;
            }

            // DÉTERMINER LE STATUT INITIAL DU PAIEMENT ET DE LA COMMANDE
            let initialPaymentStatus = 'pending';
            let initialOrderStatus = 'pending';

            // Si la méthode de paiement est Mobile Money (ou Cash on Delivery), on simule un paiement direct
            if (['mobile_money', 'cash_on_delivery'].includes(paymentMethod)) {
              initialPaymentStatus = 'completed';
              initialOrderStatus = 'processing'; // Passer directement en traitement
            }
            // Pour les autres méthodes (PayPal, Carte Bancaire), le paiement reste en attente.

            // 2. Créer la commande principale dans la base de données
            createdOrder = await Order.create({ // Assigner à createdOrder
              userId: userId, // ID utilisateur du token authentifié
              totalAmount: totalAmount.toFixed(2), // S'assurer que le montant total est formaté correctement
              shippingAddress,
              paymentMethod,
              isInternational: isInternational || false,
              shippingFees: finalShippingFees.toFixed(2),
              status: initialOrderStatus, // Utiliser le statut initial déterminé
              paymentStatus: initialPaymentStatus, // Utiliser le statut de paiement initial déterminé
              shippingCountryCode: shippingCountryCode || null, // STOCKER LE CODE PAYS
            }, { transaction: t });
            console.log('Backend (createOrder): Commande principale créée avec ID:', createdOrder.id);

            // 3. Créer les OrderItems associés et mettre à jour le stock (dans la même transaction)
            for (const item of itemsForOrder) {
              await OrderItem.create({
                orderId: createdOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              }, { transaction: t });

              // Décrémenter le stock du produit
              const product = await Product.findByPk(item.productId, { transaction: t });
              product.stock -= item.quantity;
              await product.save({ transaction: t });
              console.log(`Backend (createOrder): Stock du produit ${product.name} (ID: ${product.id}) mis à jour à ${product.stock}`);
            }

            // 4. Commettre la transaction
            await t.commit();
            console.log('Backend (createOrder): Transaction de commande commise avec succès.');

            // Renvoyer la réponse avant l'envoi de l'e-mail pour éviter le problème du rollback
            res.status(201).json(createdOrder);

          } catch (error) {
            // Si une erreur se produit AVANT le commit, annuler la transaction
            if (t.finished === 'pending') { // Vérifier si la transaction n'a pas déjà été commise/rollback
              await t.rollback();
              console.error('Backend (createOrder): Erreur lors de la création de la commande. Transaction annulée. Détails de l\'erreur :', error);
            } else {
              console.error('Backend (createOrder): Erreur après la validation de la transaction (mais pas de nouveau rollback) :', error);
            }

            // Retourner un message d'erreur plus spécifique si possible
            if (error.message.includes("Stock insuffisant")) {
              return res.status(400).json({ message: error.message });
            }
            // Si l'erreur est déjà traitée par res.status, ne pas renvoyer de nouvelle réponse
            if (!res.headersSent) {
              res.status(500).json({ message: 'Erreur serveur lors de la création de la commande.' });
            }
            return; // Important pour éviter d'exécuter la suite après un renvoi d'erreur
          }

          // 5. Envoyer un email de confirmation au client (HORS DE LA TRANSACTION)
          // Cette partie s'exécutera UNIQUEMENT si la transaction a été commise avec succès.
          try {
            const createdOrderWithDetails = await Order.findByPk(createdOrder.id, {
                include: [
                  { model: OrderItem, as: 'orderItems', include: [{ model: Product, as: 'product' }] },
                  { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
                ]
            });

            if (createdOrderWithDetails && createdOrderWithDetails.user && process.env.EMAIL_FROM) {
                console.log('Backend (createOrder): Tentative d\'envoi de l\'email de confirmation de commande au client...');
                const orderSummaryHtml = createdOrderWithDetails.orderItems.map(item => `
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.product.name}</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${parseFloat(item.price).toFixed(2)} XAF</td>
                    </tr>
                `).join('');

                // Utiliser la somme des prix des articles pour le sous-total dans l'email
                const subtotalForEmail = createdOrderWithDetails.orderItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

                // Utilisez une URL de logo hébergée si vous en avez une, sinon un placeholder plus neutre
                const logoUrl = process.env.APP_LOGO_URL || 'https://placehold.co/150x50/007bff/ffffff?text=MboaConnect+Logo'; // Assurez-vous que APP_LOGO_URL est défini dans votre .env si vous avez un vrai logo

                await sendEmail({
                    email: createdOrderWithDetails.user.email,
                    subject: `🎉 Votre commande MboaConnect #${createdOrderWithDetails.id} a été reçue !`,
                    html: `
                        <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                                <img src="${logoUrl}" alt="Logo MboaConnect" style="max-width: 180px; height: auto; display: block; margin: 0 auto 15px; border-radius: 8px;">
                                <h2 style="color: #007bff; margin: 0; font-size: 26px; font-weight: bold;">Merci pour votre commande, ${createdOrderWithDetails.user.firstName}!</h2>
                            </div>

                            <p style="margin-bottom: 20px; font-size: 16px;">Votre commande <strong style="color: #007bff;">#${createdOrderWithDetails.id}</strong> a été reçue avec succès et est actuellement en statut : <strong style="color: #28a745;">${createdOrderWithDetails.status.toUpperCase()}</strong>.</p>
                            <p style="margin-bottom: 25px; font-size: 16px;">Nous vous tiendrons informé de son avancement. Voici un récapitulatif de votre achat :</p>

                            <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin-bottom: 30px;">
                                <h3 style="color: #333; font-size: 20px; margin-top: 0; margin-bottom: 20px; text-align: center;">Détails de la commande</h3>
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                                    <thead>
                                        <tr style="background-color: #f0f0f0;">
                                            <th style="padding: 10px 0; text-align: left; border-bottom: 1px solid #ccc;">Article</th>
                                            <th style="padding: 10px 0; text-align: center; border-bottom: 1px solid #ccc;">Qté</th>
                                            <th style="padding: 10px 0; text-align: right; border-bottom: 1px solid #ccc;">Prix</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${orderSummaryHtml}
                                    </tbody>
                                </table>
                                <p style="text-align: right; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px; font-size: 16px;"><strong>Sous-total :</strong> ${subtotalForEmail.toFixed(2)} XAF</p>
                                <p style="text-align: right; font-size: 16px;"><strong>Frais de livraison :</strong> ${parseFloat(createdOrderWithDetails.shippingFees).toFixed(2)} XAF</p>
                                <p style="text-align: right; font-size: 20px; font-weight: bold; color: #dc3545; margin-top: 15px;">TOTAL PAYÉ : ${parseFloat(createdOrderWithDetails.totalAmount).toFixed(2)} XAF</p>
                            </div>

                            <div style="margin-bottom: 30px; padding: 15px; background-color: #eaf6ff; border-left: 5px solid #007bff; border-radius: 8px;">
                                <p style="margin: 0; font-size: 15px;"><strong>Adresse de livraison :</strong><br>${createdOrderWithDetails.shippingAddress}</p>
                                <p style="margin: 5px 0 0; font-size: 15px;"><strong>Méthode de paiement :</strong> ${createdOrderWithDetails.paymentMethod}</p>
                                ${createdOrderWithDetails.isInternational ? `<p style="margin: 5px 0 0; font-size: 15px;"><strong>Pays de livraison :</strong> ${createdOrderWithDetails.shippingCountryCode || 'Non spécifié'}</p>` : ''}
                            </div>

                            <p style="text-align: center; margin-top: 30px;">
                                <a href="URL_DE_VOTRE_APPLICATION_POUR_VOIR_LA_COMMANDE" style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 8px rgba(0,123,255,0.2);">Voir ma commande</a>
                            </p>

                            <p style="font-size: 14px; color: #777; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                                Cordialement,<br>
                                L'équipe MboaConnect<br>
                                <a href="mailto:${process.env.EMAIL_FROM}" style="color: #007bff; text-decoration: none;">${process.env.EMAIL_FROM.replace(/<.*>/, '').trim()}</a><br>
                                <span style="font-size: 12px;">© ${new Date().getFullYear()} MboaConnect. Tous droits réservés.</span>
                            </p>
                        </div>
                    `,
                    text: `Votre commande MboaConnect #${createdOrderWithDetails.id} a été reçue. Total: ${parseFloat(createdOrderWithDetails.totalAmount).toFixed(2)} XAF.`
                });
                console.log('Backend (createOrder): Email de confirmation de commande envoyé au client:', createdOrderWithDetails.user.email);
            } else {
                console.warn('Backend (createOrder): Impossible d\'envoyer l\'email de confirmation de commande. Informations client, commande, ou EMAIL_FROM manquantes. Client ID:', userId);
            }

          } catch (emailError) {
            console.error('Backend (createOrder): Erreur lors de l\'envoi de l\'email de confirmation :', emailError);
            // L'erreur d'e-mail ne doit pas empêcher la commande d'être réussie
          }
        };

        // @desc    Mettre à jour le statut de paiement d'une commande
        // @route   PUT /api/orders/:id/pay
        // @access  Private/Admin (ou via callback de passerelle de paiement)
        const updatePaymentStatus = async (req, res) => {
          const { paymentStatus } = req.body; // Attendu: 'completed' ou 'failed'

          // Validation
          if (!paymentStatus || !['pending', 'completed', 'failed'].includes(paymentStatus)) {
            return res.status(400).json({ message: 'Statut de paiement invalide fourni.' });
          }

          try {
            const order = await Order.findByPk(req.params.id, {
              include: [{ model: User, as: 'user', attributes: ['email', 'firstName'] }]
            });

            if (!order) {
              return res.status(404).json({ message: 'Commande non trouvée.' });
            }

            // Mettre à jour le statut de paiement
            order.paymentStatus = paymentStatus;

            // Si le paiement est "completed", mettre à jour le statut de la commande à "processing"
            if (paymentStatus === 'completed' && order.status === 'pending') {
              order.status = 'processing';
            } else if (paymentStatus === 'failed' && order.status === 'pending') {
              // Optionnel: Gérer le cas où le paiement échoue, ex: marquer la commande comme "cancelled" ou laisser "pending"
              // order.status = 'cancelled';
            }

            const updatedOrder = await order.save();

            // Envoyer un email de notification au client sur le statut du paiement
            if (updatedOrder.user && process.env.EMAIL_FROM) {
                console.log(`Backend (updatePaymentStatus): Tentative d'envoi d'email de notification de paiement au client pour commande #${updatedOrder.id}...`);
                
                const logoUrl = process.env.APP_LOGO_URL || 'https://placehold.co/150x50/007bff/ffffff?text=MboaConnect+Logo';

                await sendEmail({
                    email: updatedOrder.user.email,
                    subject: `Mise à jour du paiement de votre commande MboaConnect #${updatedOrder.id}`,
                    html: `
                        <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
                                <img src="${logoUrl}" alt="Logo MboaConnect" style="max-width: 180px; height: auto; display: block; margin: 0 auto 15px; border-radius: 8px;">
                                <h2 style="color: #007bff; margin: 0; font-size: 26px; font-weight: bold;">Mise à jour du statut de votre paiement !</h2>
                            </div>
                            <p style="margin-bottom: 20px; font-size: 16px;">Bonjour ${updatedOrder.user.firstName},</p>
                            <p style="margin-bottom: 25px; font-size: 16px;">Nous vous informons que le statut de paiement de votre commande **MboaConnect #${updatedOrder.id}** a été mis à jour.</p>
                            <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin-bottom: 30px; text-align: center;">
                                <p style="font-size: 18px; margin: 0;">Nouveau statut de paiement :</p>
                                <p style="font-size: 24px; font-weight: bold; margin: 10px 0; color: ${paymentStatus === 'completed' ? '#28a745' : '#dc3545'};">${paymentStatus.toUpperCase()}</p>
                                <p style="font-size: 18px; margin: 0;">Statut de la commande :</p>
                                <p style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #007bff;">${updatedOrder.status.toUpperCase()}</p>
                            </div>

                            ${paymentStatus === 'completed' ? '<p style="margin-bottom: 25px; font-size: 16px;">Votre commande est maintenant en cours de traitement. Nous vous enverrons une confirmation d\'expédition bientôt.</p>' : ''}
                            ${paymentStatus === 'failed' ? '<p style="margin-bottom: 25px; font-size: 16px; color: #dc3545;">Si vous pensez qu\'il s\'agit d\'une erreur ou si vous souhaitez réessayer le paiement, veuillez nous contacter.</p>' : ''}
                            
                            <p style="text-align: center; margin-top: 30px;">
                                <a href="URL_DE_VOTRE_APPLICATION_POUR_VOIR_LA_COMMANDE" style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 8px rgba(0,123,255,0.2);">Voir ma commande</a>
                            </p>

                            <p style="font-size: 14px; color: #777; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                                Cordialement,<br>
                                L'équipe MboaConnect<br>
                                <a href="mailto:${process.env.EMAIL_FROM}" style="color: #007bff; text-decoration: none;">${process.env.EMAIL_FROM.replace(/<.*>/, '').trim()}</a><br>
                                <span style="font-size: 12px;">© ${new Date().getFullYear()} MboaConnect. Tous droits réservés.</span>
                            </p>
                        </div>
                    `,
                    text: `Le paiement de votre commande #${updatedOrder.id} a été mis à jour à : ${paymentStatus.toUpperCase()}.`
                });
                console.log(`Backend (updatePaymentStatus): Email de notification de paiement envoyé au client ${updatedOrder.user.email}`);
            } else {
                console.warn('Backend (updatePaymentStatus): Impossible d\'envoyer l\'email de notification de paiement au client. Informations manquantes.');
            }

            res.json(updatedOrder);
          } catch (error) {
            console.error('Erreur dans updatePaymentStatus :', error);
            res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut de paiement de la commande.' });
          }
        };


        // @desc    Obtenir toutes les commandes de l'utilisateur authentifié
        // @route   GET /api/orders/myorders
        // @access  Private
        const getMyOrders = async (req, res) => {
          try {
            const orders = await Order.findAll({
              where: { userId: req.user.id },
              include: [{ model: OrderItem, as: 'orderItems', include: [{ model: Product, as: 'product' }] }],
              order: [['createdAt', 'DESC']],
            });
            res.json(orders);
          } catch (error) {
            console.error('Erreur dans getMyOrders :', error);
            res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes de l\'utilisateur.' });
          }
        };

        // @desc    Obtenir une commande par ID (Propriétaire de la commande ou Admin)
        // @route   GET /api/orders/:id
        // @access  Private
        const getOrderById = async (req, res) => {
          try {
            const order = await Order.findByPk(req.params.id, {
              include: [
                { model: OrderItem, as: 'orderItems', include: [{ model: Product, as: 'product' }] },
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
              ],
            });

            if (!order) {
              return res.status(404).json({ message: 'Commande non trouvée.' });
            }

            if (order.userId !== req.user.id && !req.user.isAdmin) {
              return res.status(403).json({ message: 'Non autorisé à accéder à cette commande.' });
            }

            res.json(order);
          } catch (error) {
            console.error('Erreur dans getOrderById :', error);
            res.status(500).json({ message: 'Erreur serveur lors de la récupération de la commande par ID.' });
          }
        };


        // @desc    Obtenir toutes les commandes (Admin seulement)
        // @route   GET /api/orders
        // @access  Private/Admin
        const getAllOrders = async (req, res) => {
          try {
            const orders = await Order.findAll({
              include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
              order: [['createdAt', 'DESC']],
            });
            res.json(orders);
          } catch (error) {
            console.error('Erreur dans getAllOrders :', error);
            res.status(500).json({ message: 'Erreur serveur lors de la récupération de toutes les commandes.' });
          }
        };

        // @desc    Mettre à jour le statut d'une commande (Admin seulement)
        // @route   PUT /api/orders/:id/status
        // @access  Private/Admin
        const updateOrderStatus = async (req, res) => {
          const { status } = req.body;

          if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Statut de commande invalide.' });
          }

          try {
            const order = await Order.findByPk(req.params.id);

            if (!order) {
              return res.status(404).json({ message: 'Commande non trouvée.' });
            }

            order.status = status;
            await order.save();
            res.json({ message: `Statut de la commande ${order.id} mis à jour à ${status}.`, order });
          } catch (error) {
            console.error('Erreur dans updateOrderStatus :', error);
            res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut de la commande.' });
          }
        };

        // @desc    Générer et télécharger un PDF de facture pour une commande
        // @route   GET /api/orders/:id/invoice
        // @access  Private
        const getOrderInvoice = async (req, res) => {
          try {
            const order = await Order.findByPk(req.params.id, {
              include: [
                { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] },
                {
                  model: OrderItem,
                  as: 'orderItems',
                  include: [{ model: Product, as: 'product', attributes: ['name', 'price'] }]
                }
              ]
            });

            if (!order) {
              return res.status(404).json({ message: 'Commande non trouvée.' });
            }

            if (order.userId !== req.user.id && !req.user.isAdmin) {
              return res.status(403).json({ message: 'Non autorisé à générer la facture pour cette commande.' });
            }

            const invoiceData = {
              orderId: order.id,
              clientName: `${order.user.firstName} ${order.user.lastName}`,
              clientEmail: order.user.email,
              shippingAddress: order.shippingAddress,
              totalAmount: parseFloat(order.totalAmount), // Assurez-vous que c'est un nombre
              items: order.orderItems.map(item => ({
                productName: item.product.name,
                quantity: item.quantity,
                price: parseFloat(item.price),
                subtotal: parseFloat(item.price) * item.quantity
              })),
              orderDate: order.createdAt,
              shippingFees: parseFloat(order.shippingFees),
              isInternational: order.isInternational,
            };

            // >>>>> CETTE LIGNE EST CRUCIALE POUR LE DÉBOGAGE <<<<<
            console.log('Backend (getOrderInvoice): Données de la facture pour débogage:', JSON.stringify(invoiceData, null, 2));

            const invoicesDir = path.join(__dirname, '../invoices');
            await fs.mkdir(invoicesDir, { recursive: true });
            const filePath = path.join(invoicesDir, `facture_commande_${order.id}.pdf`);

            await generateInvoicePDF(invoiceData, filePath);

            res.download(filePath, `facture_commande_${order.id}.pdf`, async (err) => {
              if (err) {
                console.error('Erreur lors du téléchargement du fichier de facture :', err);
                return res.status(500).json({ message: 'Erreur lors de la génération ou du téléchargement de la facture' });
              }
              try {
                await fs.unlink(filePath); // Supprime le fichier temporaire après envoi
              } catch (unlinkErr) {
                console.warn('Impossible de supprimer le fichier de facture temporaire :', unlinkErr);
              }
            });

          } catch (error) {
            console.error('Erreur dans getOrderInvoice :', error);
            res.status(500).json({ message: 'Erreur serveur lors de la génération de la facture.' });
          }
        };


        module.exports = {
          createOrder,
          updatePaymentStatus,
          getMyOrders,
          getOrderById,
          getAllOrders,
          updateOrderStatus,
          getOrderInvoice,
        };
        