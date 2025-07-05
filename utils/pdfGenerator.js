// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Importez axios pour télécharger l'image

// Définition d'une palette de couleurs pour la facture
const COLORS = {
  primary: '#007bff', // Bleu vif pour les éléments clés
  secondary: '#6c757d', // Gris foncé pour le texte secondaire
  text: '#343a40', // Noir presque pour le texte principal
  lightGray: '#f8f9fa', // Gris très clair pour les arrière-plans de section
  border: '#e9ecef', // Couleur de bordure douce
  totalRed: '#dc3545', // Rouge pour le montant total
  backgroundLight: '#eaf6ff', // Un bleu très clair pour les sections
};

// Fonction pour générer une facture PDF stylisée
const generateInvoicePDF = async (invoiceData, filePath) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Facture MboaConnect #${invoiceData.orderId}`,
        Author: 'MboaConnect',
      },
      // Désactiver la compression pour éviter le RangeError
      compress: false,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    let fontsLoadedSuccessfully = false; // Drapeau pour suivre le succès du chargement des polices

    // Enregistrement des polices personnalisées
    const fontsPath = path.join(__dirname, 'fonts'); // Chemin vers le dossier 'fonts'
    console.log(`Backend (pdfGenerator): Chemin des polices tenté: ${fontsPath}`);
    try {
      // Utilisation des noms de fichiers exacts après renommage
      doc.registerFont('Inter-Regular', path.join(fontsPath, 'Inter-Regular.ttf'));
      doc.registerFont('Inter-Bold', path.join(fontsPath, 'Inter-Bold.ttf'));
      fontsLoadedSuccessfully = true; // Marque comme succès si l'enregistrement ne lève pas d'erreur
      console.log('Backend (pdfGenerator): Polices Inter enregistrées avec succès.');
    } catch (fontError) {
      console.error('Backend (pdfGenerator): Erreur lors de l\'enregistrement des polices Inter. Vérifiez le chemin et les noms des fichiers:', fontError.message);
      console.warn('Backend (pdfGenerator): Utilisation des polices par défaut (Helvetica).');
      // Fallback to Helvetica if custom fonts fail to load
      doc.registerFont('Helvetica', 'Helvetica');
      doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');
      doc.font('Helvetica'); // Définit la police par défaut pour le document
    }

    // Fonction utilitaire pour choisir la police
    const getFont = (isBold = false) => {
      if (fontsLoadedSuccessfully) {
        return isBold ? 'Inter-Bold' : 'Inter-Regular';
      }
      return isBold ? 'Helvetica-Bold' : 'Helvetica';
    };

    // Gestion de la numérotation des pages
    // MODIFICATION CLÉ: COMMENTER CE BLOC POUR TESTER
    /*
    let pageNumber = 1;
    doc.on('pageAdded', () => {
      pageNumber++;
      doc.fillColor(COLORS.secondary)
         .fontSize(8)
         .font(getFont(false))
         .text(`Page ${pageNumber}`, doc.page.width - 100, doc.page.height - 30, { align: 'right' });
    });
    */

    // --- En-tête de la facture ---
    const logoUrl = process.env.APP_LOGO_URL || 'https://i.ibb.co/rfTGKmN2/logo.png';
    let logoBuffer = null;

    try {
      console.log(`Backend (pdfGenerator): Tentative de téléchargement du logo depuis: ${logoUrl}`);
      const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      logoBuffer = Buffer.from(response.data);
      console.log('Backend (pdfGenerator): Logo téléchargé avec succès.');

      doc.image(logoBuffer, 50, 45, { width: 150, height: 50, align: 'left' });
    } catch (e) {
      console.error(`Backend (pdfGenerator): Erreur lors du chargement du logo depuis l'URL (${logoUrl}):`, e.message);
      console.warn('Backend (pdfGenerator): Utilisation du texte de remplacement pour le logo.');
      doc.fontSize(18).fillColor(COLORS.primary).font(getFont(true)).text('MboaConnect', 50, 60);
    }

    doc.fillColor(COLORS.text);
    doc.fontSize(28).font(getFont(true)).text('FACTURE', { align: 'right' });
    doc.moveDown(0.5);

    doc.fontSize(10).font(getFont(false)).text(`Facture No: ${invoiceData.orderId}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoiceData.orderDate).toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown(2);

    // --- Informations de l'entreprise (votre entreprise) ---
    doc.fontSize(12).font(getFont(true)).text('MboaConnect', 50, doc.y);
    doc.font(getFont(false)).fontSize(10);
    doc.text('123 Rue Principale, Douala, Cameroun');
    doc.text('Email: info@mbaconnect.com'); // Correction: mboaconnect.com
    doc.text('Téléphone: +237 6XX XXX XXX');
    doc.moveDown(2);

    // --- Informations du client ---
    const clientInfoY = doc.y;
    doc.fillColor(COLORS.secondary).fontSize(14).font(getFont(true)).text('Détails du client', 50, clientInfoY);
    doc.rect(50, clientInfoY + 18, 200, 0.5).fill(COLORS.border);
    doc.moveDown(0.5);

    doc.fillColor(COLORS.text).fontSize(10).font(getFont(false));
    doc.text(`Nom: ${invoiceData.clientName}`);
    doc.text(`Email: ${invoiceData.clientEmail}`);
    doc.text(`Adresse de livraison: ${invoiceData.shippingAddress}`);
    if (invoiceData.isInternational && invoiceData.shippingCountryCode) {
      doc.text(`Pays: ${invoiceData.shippingCountryCode}`);
    }
    doc.moveDown(2);

    // --- Tableau des articles ---
    const itemColumn = 50;
    const quantityColumn = 300;
    const priceColumn = 380;
    const totalColumn = 450;
    const headerRowHeight = 25; // Fixed height for header row
    const tableBottomMargin = 250; // Marge pour s'assurer que les totaux et le pied de page ont de la place

    // En-têtes du tableau
    const headerY = doc.y; // Capture Y for the header row
    doc.fillColor(COLORS.primary)
       .rect(itemColumn - 5, headerY - 5, doc.page.width - itemColumn - (doc.page.width - (totalColumn + 70)) + 10, headerRowHeight)
       .fill();
    doc.fillColor('white')
       .fontSize(10)
       .font(getFont(true))
       .text('Article', itemColumn, headerY + (headerRowHeight / 4))
       .text('Qté', quantityColumn, headerY + (headerRowHeight / 4), { width: 50, align: 'center' })
       .text('Prix Unit.', priceColumn, headerY + (headerRowHeight / 4), { width: 70, align: 'right' })
       .text('Total', totalColumn, headerY + (headerRowHeight / 4), { width: 70, align: 'right' });

    doc.y = headerY + headerRowHeight; // Manually advance doc.y after header content
    doc.moveDown(0.5); // Add a small space after header row

    // Ligne de séparation sous les en-têtes
    doc.lineWidth(1);
    doc.lineCap('butt')
       .moveTo(itemColumn, doc.y) // doc.y est déjà avancé par moveDown
       .lineTo(totalColumn + 70, doc.y)
       .strokeColor(COLORS.border)
       .stroke();
    doc.moveDown(0.5); // Add a small space after separator line

    // Lignes des articles
    invoiceData.items.forEach((item, index) => {
      console.log(`Backend (pdfGenerator): Processing item ${index}: ${item.productName}`);
      // Calculate actual height needed for this row, considering potential text wrapping for product name
      const textWidthForProductName = quantityColumn - itemColumn - 10;
      doc.font(getFont(false)).fontSize(10); // Set font and size for height calculation
      const productNameHeight = doc.heightOfString(item.productName, {
        width: textWidthForProductName,
        align: 'left'
      });
      // Ensure a minimum row height, and add padding
      const actualRowHeight = Math.max(20, productNameHeight + 5); // Minimum 20 for single line, plus padding
      console.log(`Backend (pdfGenerator): Item ${index} - Calculated actualRowHeight: ${actualRowHeight.toFixed(2)}`);

      // Check if a new page is needed before drawing the current item
      if (doc.y + actualRowHeight > doc.page.height - tableBottomMargin) {
        console.log(`Backend (pdfGenerator): --- PAGE BREAK TRIGGERED ---`);
        console.log(`Backend (pdfGenerator): Item ${index} (${item.productName}) triggered page break.`);
        console.log(`Backend (pdfGenerator): Current Y: ${doc.y.toFixed(2)}`);
        console.log(`Backend (pdfGenerator): Actual Row Height: ${actualRowHeight.toFixed(2)}`);
        console.log(`Backend (pdfGenerator): Page Height: ${doc.page.height.toFixed(2)}`);
        console.log(`Backend (pdfGenerator): Bottom Margin: ${tableBottomMargin}`);
        console.log(`Backend (pdfGenerator): Threshold: ${(doc.page.height - tableBottomMargin).toFixed(2)}`);
        console.log(`Backend (pdfGenerator): Condition: ${doc.y.toFixed(2)} + ${actualRowHeight.toFixed(2)} > ${(doc.page.height - tableBottomMargin).toFixed(2)}`);
        
        doc.addPage();
        doc.y = 50; // Reset doc.y for the new page

        // Re-draw table headers on the new page
        doc.fillColor(COLORS.primary)
           .rect(itemColumn - 5, doc.y - 5, doc.page.width - itemColumn - (doc.page.width - (totalColumn + 70)) + 10, headerRowHeight)
           .fill();
        doc.fillColor('white')
           .fontSize(10)
           .font(getFont(true))
           .text('Article', itemColumn, doc.y + (headerRowHeight / 4))
           .text('Qté', quantityColumn, doc.y + (headerRowHeight / 4), { width: 50, align: 'center' })
           .text('Prix Unit.', priceColumn, doc.y + (headerRowHeight / 4), { width: 70, align: 'right' })
           .text('Total', totalColumn, doc.y + (headerRowHeight / 4), { width: 70, align: 'right' });
        
        doc.y += headerRowHeight; // Manually advance doc.y after header content
        doc.moveDown(0.5); // Add a small space after header row
        doc.lineWidth(1);
        doc.lineCap('butt')
           .moveTo(itemColumn, doc.y)
           .lineTo(totalColumn + 70, doc.y)
           .strokeColor(COLORS.border)
           .stroke();
        doc.moveDown(0.5); // Add a small space after separator line
        console.log(`Backend (pdfGenerator): New page started. doc.y after headers: ${doc.y.toFixed(2)}`);
      }

      // Draw the content of the current row at the current doc.y
      const currentItemDrawY = doc.y; // Capture the Y position for this article row

      // Use a try-catch for drawing text to isolate potential issues with specific item names
      try {
        doc.fillColor(COLORS.text).font(getFont(false)).fontSize(10);
        // Draw product name with width constraint
        doc.text(item.productName, itemColumn, currentItemDrawY, {
          width: textWidthForProductName,
          align: 'left'
        });
        // Draw other columns at the same Y coordinate
        doc.text(item.quantity, quantityColumn, currentItemDrawY, { width: 50, align: 'center' });
        doc.text(`${item.price.toFixed(2)} XAF`, priceColumn, currentItemDrawY, { width: 70, align: 'right' });
        doc.text(`${item.subtotal.toFixed(2)} XAF`, totalColumn, currentItemDrawY, { width: 70, align: 'right' });
      } catch (drawError) {
        console.error(`Backend (pdfGenerator): Error drawing item ${index} (${item.productName}):`, drawError.message);
        // Fallback: Draw a placeholder for the item if it fails
        doc.fillColor('red').font(getFont(false)).fontSize(10);
        doc.text(`[Erreur: ${item.productName}]`, itemColumn, currentItemDrawY, {
          width: textWidthForProductName,
          align: 'left'
        });
        doc.text(`-`, quantityColumn, currentItemDrawY, { width: 50, align: 'center' });
        doc.text(`-`, priceColumn, currentItemDrawY, { width: 70, align: 'right' });
        doc.text(`-`, totalColumn, currentItemDrawY, { width: 70, align: 'right' });
      }
      
      // Avancer doc.y par la hauteur réelle nécessaire pour cette ligne
      doc.y = currentItemDrawY + actualRowHeight;
      console.log(`Backend (pdfGenerator): Item ${index} drawn. doc.y advanced to: ${doc.y.toFixed(2)}`);
    });

    // Ligne de séparation après les articles
    doc.lineWidth(0.5);
    doc.lineCap('butt')
       .moveTo(itemColumn, doc.y + 10)
       .lineTo(totalColumn + 70, doc.y + 10)
       .strokeColor(COLORS.border)
       .stroke();
    doc.moveDown(1);

    // --- Totaux ---
    const totalsLeft = totalColumn - 100;
    const totalsRight = totalColumn;

    doc.fillColor(COLORS.text).fontSize(10).font(getFont(false));
    doc.text('Sous-total:', totalsLeft, doc.y, { align: 'right' });
    doc.text(`${(invoiceData.totalAmount - invoiceData.shippingFees).toFixed(2)} XAF`, totalsRight, doc.y, { width: 70, align: 'right' });
    doc.moveDown(0.5);

    doc.text('Frais de livraison:', totalsLeft, doc.y, { align: 'right' });
    doc.text(`${invoiceData.shippingFees.toFixed(2)} XAF`, totalsRight, doc.y, { width: 70, align: 'right' });
    doc.moveDown(0.5);

    doc.fillColor(COLORS.totalRed).fontSize(16).font(getFont(true));
    doc.text('MONTANT TOTAL:', totalsLeft, doc.y, { align: 'right' });
    doc.text(`${invoiceData.totalAmount.toFixed(2)} XAF`, totalsRight, doc.y, { width: 70, align: 'right' });
    doc.moveDown(2);

    // --- Pied de page ---
    const bottomOfPage = doc.page.height - 50;
    doc.fillColor(COLORS.secondary).fontSize(9).font(getFont(false));
    doc.text('Merci de votre confiance et à bientôt pour de nouvelles commandes !', 50, bottomOfPage, { align: 'center', width: doc.page.width - 100 });
    doc.text(`MboaConnect | info@mbaconnect.com | +237 6XX XXX XXX`, 50, bottomOfPage + 12, { align: 'center', width: doc.page.width - 100 });
    doc.text(`© ${new Date().getFullYear()} MboaConnect. Tous droits réservés.`, 50, bottomOfPage + 24, { align: 'center', width: doc.page.width - 100 });

    // Numérotation de la première page (les pages suivantes sont gérées par l'événement 'pageAdded')
    // MODIFICATION CLÉ: COMMENTER CETTE LIGNE AUSSI
    /*
    doc.fillColor(COLORS.secondary)
       .fontSize(8)
       .font(getFont(false))
       .text(`Page ${pageNumber}`, doc.page.width - 100, doc.page.height - 30, { align: 'right' });
    */

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

module.exports = {
  generateInvoicePDF,
};
