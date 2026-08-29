import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 3. Recherche de Véhicules (RESTful)
export const getVehicules = async (req: Request, res: Response): Promise<void> => {
  const { plaque } = req.query;
  
  let query = db.orm.public.Vehicule.where({}); // all

  if (plaque && typeof plaque === 'string') {
    query = query.where((v) => v.numero_plaque.eq(plaque));
  }

  const vehicules = await query
    .include('personnel', (p) => p.include('utilisateur', (u) => u))
    .all();

  if (plaque && vehicules.length === 0) {
    throw new AppError('Véhicule introuvable pour cette plaque.', 404);
  }

  res.json(vehicules);
};
