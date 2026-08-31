import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 2. Recherche par Matricule ou par Nom (RESTful)
export const getPersonnel = async (req: Request, res: Response): Promise<void> => {
  const { matricule, nom } = req.query;

  // S'il n'y a pas de paramètres, on peut éventuellement tout renvoyer (avec une limite) ou exiger au moins un paramètre.
  // Pour plus de sécurité, on exige au moins un paramètre.
  // S'il n'y a pas de paramètres, on peut éventuellement tout renvoyer (avec une limite) ou exiger au moins un paramètre.
  // Pour l'instant, on renvoie tout.
  let query = db.orm.public.Utilisateur.where((u) => u.est_actif.eq(true));

  if (matricule && typeof matricule === 'string') {
    query = query.where({ matricule });
  }

  if (nom && typeof nom === 'string') {
    query = query.where((u) => u.nom.ilike(`%${nom}%`));
  }

  const personnels = await query
    .include('personnel', (p) => p.include('vehicules', (v) => v).include('fonction', (f) => f))
    .all();

  // Ne garder que ceux qui sont des "Personnels" (qui ont un profil Personnel)
  const result = personnels.filter(u => u.personnel !== null);

  // Si on cherchait par matricule (recherche exacte), on renvoie soit un objet, soit une erreur 404
  if (matricule && result.length === 0) {
    throw new AppError('Personnel introuvable avec ce matricule.', 404);
  }

  res.json(result);
};

// 5. Ajout de Véhicule à la volée
export const addVehiculeToPersonnel = async (req: Request, res: Response): Promise<void> => {
  const matricule = req.params.matricule as string;
  const { numero_plaque, plaque, marque, couleur } = req.body;
  
  const finalPlaque = numero_plaque || plaque;

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

  // Création du véhicule lié à l'ID interne du personnel trouvé
  const newVehicule = await db.orm.public.Vehicule.create({
    numero_plaque: finalPlaque,
    id_personnel: utilisateur.personnel.id as number,
    marque: marque || null,
    couleur: couleur || null
  });

  res.status(201).json(newVehicule);
};
