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
    .include('personnel', (p) => p.include('vehicules', (v) => v))
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
