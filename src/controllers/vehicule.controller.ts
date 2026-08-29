import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 3. Recherche par Plaque (Plan B)
export const searchByPlaque = async (req: Request, res: Response): Promise<void> => {
  const { plaque } = req.query;
  
  if (!plaque || typeof plaque !== 'string') {
    throw new AppError('Le paramètre plaque est requis.', 400);
  }

  const vehicule = await db.orm.public.Vehicule
    .where((v) => v.numero_plaque.eq(plaque))
    .include('personnel', (p) => p.include('utilisateur', (u) => u))
    .first();

  if (!vehicule) {
    throw new AppError('Véhicule introuvable pour cette plaque.', 404);
  }

  res.json(vehicule);
};
