import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 2. Recherche par Matricule ou par Nom (RESTful)
export const getPersonnel = async (req: Request, res: Response): Promise<void> => {
  const { matricule, nom, statut } = req.query;

  // S'il n'y a pas de paramètres, on peut éventuellement tout renvoyer (avec une limite) ou exiger au moins un paramètre.
  // Pour plus de sécurité, on exige au moins un paramètre.
  // S'il n'y a pas de paramètres, on peut éventuellement tout renvoyer (avec une limite) ou exiger au moins un paramètre.
  // Pour l'instant, on renvoie tout.
  let query = db.orm.public.Utilisateur.where((u) => u.id.gte(0));

  if (statut === 'actif') {
    query = query.where({ est_actif: true });
  } else if (statut === 'suspendu') {
    query = query.where({ est_actif: false });
  }

  if (matricule && typeof matricule === 'string') {
    query = query.where({ matricule });
  }

  if (nom && typeof nom === 'string') {
    query = query.where((u) => u.nom.ilike(`%${nom}%`));
  }

  const personnels = await query
    .include('personnel', (p) => p.include('vehicules', (v) => v).include('fonction', (f) => f))
    .orderBy((u) => u.id.desc())
    .all();

  // Ne garder que ceux qui ont un profil Personnel ET qui ne sont PAS des utilisateurs système (admin, agent, supervision)
  const result = personnels.filter(u => {
    if (!u.personnel) return false;
    const roles = (u.role as string[]) || [];
    return !roles.some(r => ['agent', 'supervision', 'admin'].includes(r));
  });

  // Si on cherchait par matricule (recherche exacte), on renvoie soit un objet, soit une erreur 404
  if (matricule && result.length === 0) {
    throw new AppError('Personnel introuvable avec ce matricule.', 404);
  }

  res.json(result);
};

// 2b. Statistiques globales du Personnel (KPIs exacts)
export const getPersonnelStats = async (req: Request, res: Response): Promise<void> => {
  const users = await db.orm.public.Utilisateur
    .where((u) => u.id.gte(0))
    .include('personnel', (p) => p.include('vehicules', (v) => v).include('fonction', (f) => f))
    .all();

  // Ne garder que le personnel non-système
  const purePersonnel = users.filter(u => {
    if (!u.personnel) return false;
    const roles = (u.role as string[]) || [];
    return !roles.some(r => ['agent', 'supervision', 'admin'].includes(r));
  });

  const total = purePersonnel.length;

  const directionCadres = purePersonnel.filter(u => {
    const fNom = u.personnel?.fonction?.nom?.toLowerCase() || '';
    return fNom.includes('cadre') || fNom.includes('direction') || fNom.includes('directeur') || fNom.includes('chef') || fNom.includes('responsable');
  }).length;

  const vehiculesRattaches = purePersonnel.reduce((acc, u) => {
    const vehs = u.personnel?.vehicules || [];
    return acc + vehs.length;
  }, 0);

  const comptesActifs = purePersonnel.filter(u => u.est_actif !== false).length;

  res.json({
    total,
    direction_cadres: directionCadres,
    vehicules_rattaches: vehiculesRattaches,
    comptes_actifs: comptesActifs,
    directionCadres,
    vehiculesRattaches,
    comptesActifs
  });
};

// 5. Ajout de Véhicule à la volée
export const addVehiculeToPersonnel = async (req: Request, res: Response): Promise<void> => {
  const matricule = req.params.matricule as string;
  const { numero_plaque, plaque, marque, couleur } = req.body;
  
  const finalPlaqueRaw = numero_plaque || plaque;
  const finalPlaque = finalPlaqueRaw ? finalPlaqueRaw.replace(/\s+/g, '').toUpperCase() : '';

  if (!finalPlaque) {
    throw new AppError('La plaque (numero_plaque) est requise.', 400);
  }

  // Chercher l'utilisateur par matricule pour obtenir son profil Personnel
  const utilisateur = await db.orm.public.Utilisateur
    .where({ matricule })
    .include('personnel', (p) => p)
    .first();

  if (!utilisateur || !utilisateur.personnel) {
    throw new AppError('Personnel introuvable avec ce matricule.', 404);
  }

  const existingVehicule = await db.orm.public.Vehicule.where({ numero_plaque: finalPlaque }).first();
  
  if (existingVehicule) {
    throw new AppError(`La plaque ${finalPlaque} est déjà enregistrée dans le système.`, 409);
  }

  // Création du véhicule lié à l'ID interne du personnel trouvé
  const newVehicule = await db.orm.public.Vehicule.create({
    numero_plaque: finalPlaque,
    id_personnel: utilisateur.personnel.id as number,
    marque: marque || null,
    couleur: couleur || null,
    type: 'personnel'
  });

  res.status(201).json(newVehicule);
};


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

  let qrCodeBase64: string | null = (utilisateur.personnel.qr_code as string) || null;
  
  // S'il n'existe pas, on le génère à la volée !
  if (!qrCodeBase64) {
    const QRCode = (await import('qrcode')).default;
    qrCodeBase64 = await QRCode.toDataURL(matricule);
    await db.orm.public.Personnel.where({ id: Number(utilisateur.personnel.id) }).update({ qr_code: qrCodeBase64 as string });
  }

  const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
  const imgBuffer = Buffer.from(base64Data, 'base64');
  
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': imgBuffer.length,
    'Content-Disposition': `attachment; filename="qrcode-${matricule}.png"`
  });
  res.end(imgBuffer);
};
