import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';
import { Temporal } from '@js-temporal/polyfill';

/**
 * Récupérer le profil complet de l'utilisateur connecté (Personnel)
 */
export const getMonProfil = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user?.id;

  const utilisateur = await db.orm.public.Utilisateur
    .where({ id: userId })
    .include('personnel', (p) => p.include('fonction', (f) => f).include('vehicules', (v) => v))
    .first();

  if (!utilisateur || !utilisateur.personnel) {
    throw new AppError('Profil personnel introuvable.', 404);
  }

  const { mot_de_passe, ...userInfo } = utilisateur;
  res.json({ profil: userInfo });
};

/**
 * Récupérer l'image base64 de son propre QR Code
 */
export const getMonQRCode = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const id_personnel = req.user?.id_personnel;

  if (!id_personnel) {
    throw new AppError('Accès refusé. Vous n\'êtes pas reconnu comme personnel.', 403);
  }

  const personnel = await db.orm.public.Personnel.where({ id: id_personnel }).first();
  if (!personnel || !personnel.qr_code) {
    throw new AppError('QR Code introuvable.', 404);
  }

  res.json({ qr_code: personnel.qr_code });
};

/**
 * Récupérer l'historique de ses propres passages
 */
export const getMonHistorique = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const id_personnel = req.user?.id_personnel;
  
  if (!id_personnel) {
    throw new AppError('Accès refusé.', 403);
  }

  const { date_debut, date_fin, page, limit } = req.query as unknown as {
    date_debut?: string;
    date_fin?: string;
    page: number;
    limit: number;
  };

  const offset = (page - 1) * limit;

  let baseQuery = db.orm.public.Mouvement.where({ id_personnel });

  if (date_debut) {
    const startInstant = Temporal.Instant.from(new Date(date_debut as string).toISOString());
    baseQuery = baseQuery.where((m) => m.heure_arrivee.gte(startInstant));
  }
  if (date_fin) {
    const endInstant = Temporal.Instant.from(new Date(date_fin as string).toISOString());
    baseQuery = baseQuery.where((m) => m.heure_arrivee.lte(endInstant));
  }

  const countResult = await baseQuery.aggregate((a) => ({ total: a.count() }));
  const total = countResult.total;

  const mouvements = await baseQuery
    .include('vehicule', (v) => v)
    .include('agent', (a) => a.include('utilisateur', (u) => u))
    .orderBy((m) => m.heure_arrivee.desc())
    .limit(limit)
    .offset(offset)
    .all();

  res.json({
    data: mouvements,
    meta: {
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit)
    }
  });
};

/**
 * Récupérer son statut de présence en temps réel
 */
export const getMonStatut = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const id_personnel = req.user?.id_personnel;
  
  if (!id_personnel) {
    throw new AppError('Accès refusé.', 403);
  }

  const dernierMouvement = await db.orm.public.Mouvement
    .where({ id_personnel })
    .include('vehicule', (v) => v)
    .include('place_parking', (p) => p)
    .orderBy((m) => m.heure_arrivee.desc())
    .first();

  if (!dernierMouvement) {
    res.json({ statut: 'inconnu', message: 'Aucun historique de passage trouvé.' });
    return;
  }

  if (dernierMouvement.statut === 'sur_site') {
    res.json({
      statut: 'sur_site',
      heure_arrivee: dernierMouvement.heure_arrivee ? new Date((dernierMouvement.heure_arrivee as any).epochMilliseconds).toISOString() : null,
      vehicule: dernierMouvement.vehicule,
      place_parking: dernierMouvement.place_parking
    });
  } else {
    res.json({
      statut: 'hors_site',
      derniere_sortie: dernierMouvement.heure_depart ? new Date((dernierMouvement.heure_depart as any).epochMilliseconds).toISOString() : null,
      vehicule: dernierMouvement.vehicule
    });
  }
};

/**
 * Récupérer la liste de ses véhicules enregistrés
 */
export const getMesVehicules = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const id_personnel = req.user?.id_personnel;
  
  if (!id_personnel) {
    throw new AppError('Accès refusé.', 403);
  }

  const vehicules = await db.orm.public.Vehicule.where({ id_personnel }).all();

  res.json({ vehicules });
};

/**
 * Récupérer le détail de sa place de parking attitrée
 */
export const getMaPlace = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const id_personnel = req.user?.id_personnel;
  
  if (!id_personnel) {
    throw new AppError('Accès refusé.', 403);
  }

  const personnel = await db.orm.public.Personnel
    .where({ id: id_personnel })
    .include('fonction', (f) => f.include('places_parking', (p) => p))
    .first();

  if (!personnel || !personnel.fonction) {
    throw new AppError('Fonction introuvable pour ce personnel.', 404);
  }

  res.json({
    fonction: personnel.fonction.nom,
    places_attitrees: personnel.fonction.places_parking
  });
};
