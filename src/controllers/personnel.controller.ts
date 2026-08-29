import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 2. Recherche par QR Code / Matricule
export const getPersonnelByMatricule = async (req: Request, res: Response): Promise<void> => {
  const { matricule } = req.params;
  
  // Un Personnel est lié à un Utilisateur, on vérifie aussi qu'il est actif.
  const personnel = await db.orm.public.Utilisateur
    .where({ matricule: matricule as string, est_actif: true })
    .include('personnel', (p) => p.include('vehicules', (v) => v))
    .first();

  if (!personnel || !personnel.personnel) {
    throw new AppError('Personnel introuvable avec ce matricule.', 404);
  }

  res.json(personnel);
};

// 4. Recherche par Nom (Plan C)
export const searchPersonnelByName = async (req: Request, res: Response): Promise<void> => {
  const { nom } = req.query;
  
  if (!nom || typeof nom !== 'string') {
    throw new AppError('Le paramètre nom est requis.', 400);
  }

  const personnels = await db.orm.public.Utilisateur
    .where((u) => u.nom.ilike(`%${nom as string}%`))
    .where((u) => u.est_actif.eq(true))
    .include('personnel', (p) => p.include('vehicules', (v) => v))
    .all();
    
  // Ne garder que ceux qui sont des "Personnels" (qui ont un profil Personnel)
  const result = personnels.filter(u => u.personnel !== null);

  res.json(result);
};

// 5. Ajout de Véhicule à la volée
export const addVehiculeToPersonnel = async (req: Request, res: Response): Promise<void> => {
  const { id_personne } = req.params;
  const { plaque } = req.body;
  
  if (!plaque) {
    throw new AppError('La plaque est requise.', 400);
  }

  // Calcul de l'ID manuellement car le schéma actuel n'utilise pas @default(autoincrement()) sur Vehicule.id
  // Bien que nous l'ayons probablement ajouté plus tôt, nous le gardons ici s'il est manuel
  // En Prisma Next, si on utilise auto-increment, on n'a pas besoin de renseigner l'ID.
  // Faisons la création classique sans ID manuel, la DB Postgres s'en chargera
  const newVehicule = await db.orm.public.Vehicule.create({
    numero_plaque: plaque,
    id_personnel: Number(id_personne)
  });

  res.status(201).json(newVehicule);
};
