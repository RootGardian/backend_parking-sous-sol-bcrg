import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 3. Recherche de Véhicules (RESTful)
export const getVehicules = async (req: Request, res: Response): Promise<void> => {
  const { plaque, categorie } = req.query;
  
  let query = db.orm.public.Vehicule.where({}); // all

  if (plaque && typeof plaque === 'string') {
    const plaqueNorm = plaque.replace(/\s+/g, '').toUpperCase();
    query = query.where((v) => v.numero_plaque.eq(plaqueNorm));
  }
  
  if (categorie && typeof categorie === 'string') {
    if (categorie === 'Personnel BCRG') {
      query = query.where({ type: 'personnel' });
    } else if (categorie === 'Visiteur') {
      query = query.where({ type: 'visiteur' });
    }
  }

  const vehicules = await query
    .include('personnel', (p) => p.include('utilisateur', (u) => u))
    .orderBy((v) => v.id.desc())
    .all();

  if (plaque && vehicules.length === 0) {
    throw new AppError('Véhicule introuvable pour cette plaque.', 404);
  }

  res.json(vehicules);
};

export const getFlotteStats = async (req: Request, res: Response): Promise<void> => {
  const allVehicules = await db.orm.public.Vehicule.all();

  const total = allVehicules.length;

  const personnelCount = allVehicules.filter(
    (v) => v.type === 'personnel' || v.id_personnel !== null
  ).length;

  const visiteursCount = allVehicules.filter(
    (v) => v.type === 'visiteur' || (v.id_personnel === null && v.type !== 'personnel')
  ).length;

  res.json({
    total,
    personnel: personnelCount,
    visiteurs: visiteursCount
  });
};
