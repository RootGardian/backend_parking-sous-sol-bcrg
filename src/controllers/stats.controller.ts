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
  const countResult = await query.aggregate((a) => ({ total: a.count() }));
  const total = countResult.total;

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
  const { date_debut, date_fin } = req.query;

  const now = new Date();
  let dateDebutFiltre = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let dateFinFiltre = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (date_debut) {
    const start = new Date(date_debut as string);
    if (!isNaN(start.getTime())) dateDebutFiltre = start;
  }
  if (date_fin) {
    const end = new Date(date_fin as string);
    if (!isNaN(end.getTime())) dateFinFiltre = end;
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Présents sur site (en ce moment, indépendant du filtre de date)
  const presentsSurSite = await db.orm.public.Mouvement
    .where({ statut: 'sur_site' })
    .aggregate((a) => ({ total: a.count() })).then(r => r.total);

  const capaciteMax = 200; // Hardcoded for now
  const tauxOccupation = Math.round((Number(presentsSurSite) / capaciteMax) * 100);

  // 2. Entrées sur la période
  let queryEntrees = db.orm.public.Mouvement.where((m) => m.heure_arrivee.gte(dateDebutFiltre));
  queryEntrees = queryEntrees.where((m) => m.heure_arrivee.lte(dateFinFiltre));
  const entreesJour = await queryEntrees.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  // 3. Sorties sur la période
  let querySorties = db.orm.public.Mouvement.where((m) => m.heure_depart.gte(dateDebutFiltre));
  querySorties = querySorties.where((m) => m.heure_depart.lte(dateFinFiltre));
  const sortiesJour = await querySorties.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  // 4. Flux Horaire (Sur la période)
  const mouvementsJour = await queryEntrees.all();

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
      if (depDate >= dateDebutFiltre && depDate <= dateFinFiltre) {
        const h = depDate.getHours();
        const slot = fluxHoraire[h];
        if (slot) slot.sorties++;
      }
    }
  }

  // 5. Répartition de la Flotte (Global)
  const vehiculesPersonnel = await db.orm.public.Vehicule.where({ type: 'personnel' }).aggregate((a) => ({ total: a.count() })).then(r => r.total);
  const vehiculesVisiteurs = await db.orm.public.Vehicule.where({ type: 'visiteur' }).aggregate((a) => ({ total: a.count() })).then(r => r.total);
  const vehiculesLegacyPersonnel = await db.orm.public.Vehicule.where((v) => v.id_personnel.isNotNull()).aggregate((a) => ({ total: a.count() })).then(r => r.total);

  const totalPersonnel = Number(vehiculesPersonnel) > 0 ? Number(vehiculesPersonnel) : Number(vehiculesLegacyPersonnel);
  const totalVisiteurs = Number(vehiculesVisiteurs);

  // 6. Entrées par catégorie sur la période
  let queryEntreesPerso = db.orm.public.Mouvement.where({ type_entree: 'personnel' }).where((m) => m.heure_arrivee.gte(dateDebutFiltre));
  queryEntreesPerso = queryEntreesPerso.where((m) => m.heure_arrivee.lte(dateFinFiltre));
  const entreesPersonnelJour = await queryEntreesPerso.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  let queryEntreesVisit = db.orm.public.Mouvement.where({ type_entree: 'visiteur' }).where((m) => m.heure_arrivee.gte(dateDebutFiltre));
  queryEntreesVisit = queryEntreesVisit.where((m) => m.heure_arrivee.lte(dateFinFiltre));
  const entreesVisiteursJour = await queryEntreesVisit.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  const entreesTotalMois = await db.orm.public.Mouvement
    .where((m) => m.heure_arrivee.gte(startOfMonth))
    .aggregate((a) => ({ total: a.count() })).then(r => r.total);

  // Derniers mouvements
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
    flux_horaire: fluxHoraire.filter(f => parseInt(f.heure) >= 6 && parseInt(f.heure) <= 19),
    repartition_flotte: {
      personnel: totalPersonnel,
      visiteurs: totalVisiteurs
    },
    derniers_mouvements: derniersMouvements,
    trafic_jour: {
      personnel: Number(entreesPersonnelJour),
      visiteurs: Number(entreesVisiteursJour),
      total: Number(entreesPersonnelJour) + Number(entreesVisiteursJour)
    },
    trafic_mois: Number(entreesTotalMois)
  });
};
