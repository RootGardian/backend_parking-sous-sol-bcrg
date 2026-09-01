const fs = require('fs');

let controller = fs.readFileSync('src/controllers/personnel.controller.ts', 'utf8');

const newFunction = `

// 6. Télécharger le QR Code
export const downloadQRCode = async (req: Request, res: Response): Promise<void> => {
  const matricule = req.params.matricule as string;
  
  const utilisateur = await db.orm.public.Utilisateur
    .where({ matricule })
    .include('personnel', (p) => p)
    .first();

  if (!utilisateur || !utilisateur.personnel) {
    throw new AppError('Personnel introuvable avec ce matricule.', 404);
  }

  let qrCodeBase64 = utilisateur.personnel.qr_code;
  
  // S'il n'existe pas, on le génère à la volée !
  if (!qrCodeBase64) {
    const QRCode = (await import('qrcode')).default;
    qrCodeBase64 = await QRCode.toDataURL(matricule);
    await db.orm.public.Personnel.where({ id: utilisateur.personnel.id }).update({ qr_code: qrCodeBase64 });
  }

  const base64Data = qrCodeBase64.replace(/^data:image\\/png;base64,/, '');
  const imgBuffer = Buffer.from(base64Data, 'base64');
  
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': imgBuffer.length,
    'Content-Disposition': \`attachment; filename="qrcode-\${matricule}.png"\`
  });
  res.end(imgBuffer);
};
`;

if (!controller.includes('downloadQRCode')) {
  fs.writeFileSync('src/controllers/personnel.controller.ts', controller + newFunction);
}

let routes = fs.readFileSync('src/routes/personnel.routes.ts', 'utf8');
routes = routes.replace('getPersonnel, addVehiculeToPersonnel', 'getPersonnel, addVehiculeToPersonnel, downloadQRCode');

const newRoute = `
// 6. Télécharger le QR Code
router.get('/personnel/:matricule/qrcode', authMiddleware, downloadQRCode);

`;
if (!routes.includes('/qrcode')) {
  routes = routes.replace('export default router;', newRoute + 'export default router;');
  fs.writeFileSync('src/routes/personnel.routes.ts', routes);
}
