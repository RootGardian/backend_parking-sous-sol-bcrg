import path from 'path';
import fs from 'fs';

/**
 * Applique le logo au milieu en haut (opaque, sans superposition) 
 * et le filigrane en bas à droite sur chaque page du document PDF.
 */
export const applyPdfHeaderFooter = (doc: any): void => {
  const logoPath = fs.existsSync(path.join(__dirname, '..', 'assets', 'logo-bcrg.jpeg'))
    ? path.join(__dirname, '..', 'assets', 'logo-bcrg.jpeg')
    : path.join(process.cwd(), 'src', 'assets', 'logo-bcrg.jpeg');

  const basDroitePath = fs.existsSync(path.join(__dirname, '..', 'assets', 'bas_droite.png'))
    ? path.join(__dirname, '..', 'assets', 'bas_droite.png')
    : path.join(process.cwd(), 'src', 'assets', 'bas_droite.png');

  const drawDecorations = () => {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // 1. Filigrane en bas à droite (agrandi et plus visible)
    if (fs.existsSync(basDroitePath)) {
      const watermarkWidth = 240;
      const xWatermark = pageWidth - watermarkWidth - 10;
      const yWatermark = pageHeight - 220;

      doc.save();
      doc.opacity(0.45); // Plus visible
      doc.image(basDroitePath, xWatermark, yWatermark, { width: watermarkWidth });
      doc.restore();
    }

    // 2. Logo en haut au milieu (Rien ne se superpose dessus)
    if (fs.existsSync(logoPath)) {
      const logoWidth = 90;
      const xLogo = (pageWidth - logoWidth) / 2;
      const yLogo = 20;

      doc.save();
      doc.opacity(1.0);
      doc.image(logoPath, xLogo, yLogo, { width: logoWidth });
      doc.restore();
    }
  };

  // Dessiner sur la page actuelle
  drawDecorations();

  // Dessiner automatiquement sur chaque nouvelle page
  doc.on('pageAdded', () => {
    drawDecorations();
  });
};

/**
 * Enregistre et applique la police Verdana (et Verdana-Bold) sur le document PDF.
 */
export const registerVerdanaFont = (doc: any): { fontRegular: string; fontBold: string } => {
  const fontDir = fs.existsSync(path.join(__dirname, '..', 'assets', 'fonts'))
    ? path.join(__dirname, '..', 'assets', 'fonts')
    : path.join(process.cwd(), 'src', 'assets', 'fonts');

  const regularPath = path.join(fontDir, 'verdana.ttf');
  const boldPath = path.join(fontDir, 'verdanab.ttf');

  let fontRegular = 'Helvetica';
  let fontBold = 'Helvetica-Bold';

  if (fs.existsSync(regularPath)) {
    doc.registerFont('Verdana', regularPath);
    fontRegular = 'Verdana';
  } else if (fs.existsSync('C:\\Windows\\Fonts\\verdana.ttf')) {
    doc.registerFont('Verdana', 'C:\\Windows\\Fonts\\verdana.ttf');
    fontRegular = 'Verdana';
  }

  if (fs.existsSync(boldPath)) {
    doc.registerFont('Verdana-Bold', boldPath);
    fontBold = 'Verdana-Bold';
  } else if (fs.existsSync('C:\\Windows\\Fonts\\verdanab.ttf')) {
    doc.registerFont('Verdana-Bold', 'C:\\Windows\\Fonts\\verdanab.ttf');
    fontBold = 'Verdana-Bold';
  }

  // Appliquer la police régulière par défaut
  doc.font(fontRegular);

  return { fontRegular, fontBold };
};
