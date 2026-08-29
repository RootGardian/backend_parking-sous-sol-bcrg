import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

/**
 * Récupère l'historique paginé des mouvements avec filtres
 */
export const getHistorique = async (req: Request, res: Response): Promise<void> => {
  const { date_debut, date_fin, type_entree, page = '1', limite = '20' } = req.query;

  const pageNumber = Math.max(1, parseInt(page as string, 10));
  const limitNumber = Math.max(1, parseInt(limite as string, 10));
  const offset = (pageNumber - 1) * limitNumber;

  let query = db.orm.public.Mouvement;

  // Filtrage par type d'entrée si fourni
  if (type_entree && (type_entree === 'personnel' || type_entree === 'visiteur')) {
    query = query.where({ type_entree: type_entree as any });
  }

  // Filtrage par dates (heure d'arrivée)
  if (date_debut) {
    const start = new Date(date_debut as string);
    if (!isNaN(start.getTime())) {
      query = query.where((m) => m.heure_arrivee.gte(start));
    }
  }

  if (date_fin) {
    const end = new Date(date_fin as string);
    if (!isNaN(end.getTime())) {
      query = query.where((m) => m.heure_arrivee.lte(end));
    }
  }

  // Requête du total pour la pagination
  const total = await query.count();

  // Récupération des données paginées
  const mouvements = await query
    .include('vehicule', (v) => v.include('personnel', (p) => p.include('utilisateur', (u) => u)))
    .include('personnel_visite', (p) => p.include('utilisateur', (u) => u))
    .include('agent', (a) => a.include('utilisateur', (u) => u))
    .orderBy((m) => m.heure_arrivee.desc())
    .limit(limitNumber)
    .offset(offset)
    .all();

  res.json({
    data: mouvements,
    pagination: {
      total,
      page: pageNumber,
      limite: limitNumber,
      total_pages: Math.ceil(Number(total) / limitNumber)
    }
  });
};

/**
 * Récupère les statistiques clés pour le Dashboard
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  
  // Début de la journée (00:00:00)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Début du mois (1er du mois à 00:00:00)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Entrées du jour (Personnel)
  const entreesPersonnelJour = await db.orm.public.Mouvement
    .where({ type_entree: 'personnel' })
    .where((m) => m.heure_arrivee.gte(startOfDay))
    .count();

  // 2. Entrées du jour (Visiteurs)
  const entreesVisiteursJour = await db.orm.public.Mouvement
    .where({ type_entree: 'visiteur' })
    .where((m) => m.heure_arrivee.gte(startOfDay))
    .count();

  // 3. Entrées totales depuis le début du mois
  const entreesTotalMois = await db.orm.public.Mouvement
    .where((m) => m.heure_arrivee.gte(startOfMonth))
    .count();

  // 4. Classement des Gouverneurs par visites reçues ce mois-ci
  // Récupère toutes les visites du mois, puis regroupe par gouverneur en JS
  const visitesMois = await db.orm.public.Mouvement
    .where({ type_entree: 'visiteur' })
    .where((m) => m.heure_arrivee.gte(startOfMonth))
    .include('personnel_visite', (p) => p.include('utilisateur', (u) => u))
    .all();

  const visitesParGouverneur: Record<number, { nom: string; visites: number }> = {};

  for (const m of visitesMois) {
    if (m.personnel_visite && m.id_personnel_visite) {
      const gouvId = m.id_personnel_visite;
      const nomComplet = `${m.personnel_visite.utilisateur?.nom || ''} ${m.personnel_visite.utilisateur?.prenom || ''}`.trim();
      
      if (!visitesParGouverneur[gouvId]) {
        visitesParGouverneur[gouvId] = { nom: nomComplet, visites: 0 };
      }
      visitesParGouverneur[gouvId].visites++;
    }
  }

  // Convertit l'objet en tableau, le trie par nombre de visites décroissant, et prend le top 5
  const topGouverneursVisites = Object.values(visitesParGouverneur)
    .sort((a, b) => b.visites - a.visites)
    .slice(0, 5);

  res.json({
    trafic_jour: {
      personnel: Number(entreesPersonnelJour),
      visiteurs: Number(entreesVisiteursJour),
      total: Number(entreesPersonnelJour) + Number(entreesVisiteursJour)
    },
    trafic_mois: Number(entreesTotalMois),
    top_gouverneurs_visites_mois: topGouverneursVisites
  });
};
