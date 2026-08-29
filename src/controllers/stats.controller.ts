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
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Présents sur site
  const presentsSurSite = await db.orm.public.Mouvement
    .where({ statut: 'sur_site' })
    .count();

  const capaciteMax = 200; // Hardcoded for now
  const tauxOccupation = Math.round((Number(presentsSurSite) / capaciteMax) * 100);

  // 2. Entrées du jour
  const entreesJour = await db.orm.public.Mouvement
    .where((m) => m.heure_arrivee.gte(startOfDay))
    .count();

  // 3. Sorties du jour
  const sortiesJour = await db.orm.public.Mouvement
    .where((m) => m.heure_depart.gte(startOfDay))
    .count();

  // 4. Flux Horaire (Aujourd'hui)
  const mouvementsJour = await db.orm.public.Mouvement
    .where((m) => m.heure_arrivee.gte(startOfDay))
    .all();

  const fluxHoraire = Array.from({ length: 24 }, (_, i) => ({
    heure: `${i.toString().padStart(2, '0')}:00`,
    entrees: 0,
    sorties: 0
  }));

  for (const m of mouvementsJour) {
    if (m.heure_arrivee) {
      const arrDate = new Date(m.heure_arrivee);
      const h = arrDate.getHours();
      const slot = fluxHoraire[h];
      if (slot) slot.entrees++;
    }
    if (m.heure_depart) {
      const depDate = new Date(m.heure_depart);
      if (depDate >= startOfDay) {
        const h = depDate.getHours();
        const slot = fluxHoraire[h];
        if (slot) slot.sorties++;
      }
    }
  }

  // Only return hours from 07:00 to 18:00 to match the UI if needed, but returning 24h is fine and frontend can filter.

  // 5. Répartition de la Flotte
  const vehiculesPersonnel = await db.orm.public.Vehicule.where({ type: 'personnel' }).count();
  const vehiculesVisiteurs = await db.orm.public.Vehicule.where({ type: 'visiteur' }).count();
  
  // Fallback: if type is null, we can check if id_personnel is not null
  const vehiculesLegacyPersonnel = await db.orm.public.Vehicule.where((v) => v.id_personnel.isNotNull()).count();

  const totalPersonnel = Number(vehiculesPersonnel) > 0 ? Number(vehiculesPersonnel) : Number(vehiculesLegacyPersonnel);
  const totalVisiteurs = Number(vehiculesVisiteurs);

  // 6. Entrées du jour par catégorie (pour rétrocompatibilité si besoin)
  const entreesPersonnelJour = await db.orm.public.Mouvement
    .where({ type_entree: 'personnel' })
    .where((m) => m.heure_arrivee.gte(startOfDay))
    .count();

  const entreesVisiteursJour = await db.orm.public.Mouvement
    .where({ type_entree: 'visiteur' })
    .where((m) => m.heure_arrivee.gte(startOfDay))
    .count();

  const entreesTotalMois = await db.orm.public.Mouvement
    .where((m) => m.heure_arrivee.gte(startOfMonth))
    .count();

  // Derniers mouvements (pour affichage rapide sur le dash)
  const derniersMouvements = await db.orm.public.Mouvement
    .include('vehicule', (v) => v.include('personnel', (p) => p.include('utilisateur', (u) => u)))
    .include('agent', (a) => a.include('utilisateur', (u) => u))
    .orderBy((m) => m.heure_arrivee.desc())
    .limit(5)
    .all();

  res.json({
    kpis: {
      presents_sur_site: Number(presentsSurSite),
      capacite_max: capaciteMax,
      taux_occupation: tauxOccupation,
      entrees_jour: Number(entreesJour),
      sorties_jour: Number(sortiesJour)
    },
    flux_horaire: fluxHoraire.filter(f => parseInt(f.heure) >= 6 && parseInt(f.heure) <= 19), // Heures de bureau
    repartition_flotte: {
      personnel: totalPersonnel,
      visiteurs: totalVisiteurs
    },
    derniers_mouvements: derniersMouvements,
    // Keep legacy format for backward compatibility
    trafic_jour: {
      personnel: Number(entreesPersonnelJour),
      visiteurs: Number(entreesVisiteursJour),
      total: Number(entreesPersonnelJour) + Number(entreesVisiteursJour)
    },
    trafic_mois: Number(entreesTotalMois)
  });
};
