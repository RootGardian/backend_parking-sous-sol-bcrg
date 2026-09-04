import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// 3. Recherche de Véhicules (RESTful)
export const getVehicules = async (req: Request, res: Response): Promise<void> => {
  const { plaque, categorie } = req.query;
  
  let query = db.orm.public.Vehicule.where({}); // all

  if (plaque && typeof plaque === 'string') {
    query = query.where((v) => v.numero_plaque.eq(plaque));
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
  const totalVehicules = await db.orm.public.Vehicule.aggregate((a) => ({ total: a.count() })).then(r => r.total);
  
  const vehiculesPersonnel = await db.orm.public.Vehicule.where({ type: 'personnel' }).aggregate((a) => ({ total: a.count() })).then(r => r.total);
  const vehiculesVisiteurs = await db.orm.public.Vehicule.where({ type: 'visiteur' }).aggregate((a) => ({ total: a.count() })).then(r => r.total);

  // Pour la compatibilité si type n'est pas encore défini
  const vehiculesLegacyPersonnel = await db.orm.public.Vehicule.where((v) => v.id_personnel.isNotNull()).aggregate((a) => ({ total: a.count() })).then(r => r.total);
  const personnelCount = Number(vehiculesPersonnel) > 0 ? Number(vehiculesPersonnel) : Number(vehiculesLegacyPersonnel);

  res.json({
    total: Number(totalVehicules),
    personnel: personnelCount,
    visiteurs: Number(vehiculesVisiteurs)
  });
};
