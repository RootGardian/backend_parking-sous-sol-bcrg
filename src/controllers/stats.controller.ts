import { Temporal } from '@js-temporal/polyfill';
import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

/**
 * Récupère l'historique paginé des mouvements avec filtres
 */
export const getHistorique = async (req: Request, res: Response): Promise<void> => {
  const { date_debut, date_fin, type_entree, page, limit } = req.query as unknown as {
    date_debut?: string;
    date_fin?: string;
    type_entree?: string;
    page: number;
    limit: number;
  };

  const offset = (page - 1) * limit;

  let query = db.orm.public.Mouvement;

  // Filtrage par type d'entrée si fourni
  if (type_entree && (type_entree === 'personnel' || type_entree === 'visiteur')) {
    query = query.where({ type_entree: type_entree as any });
  }

  // Filtrage par dates (heure d'arrivée)
  if (date_debut) {
    const start = new Date(date_debut as string);
    if (!isNaN(start.getTime())) {
      query = query.where((m) => m.heure_arrivee.gte(Temporal.Instant.from(start.toISOString())));
    }
  }

  if (date_fin) {
    const end = new Date(date_fin as string);
    if (!isNaN(end.getTime())) {
      query = query.where((m) => m.heure_arrivee.lte(Temporal.Instant.from(end.toISOString())));
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

  // Calcul de la capacité maximale basée sur la table PlaceParking
  const totalPlaces = await db.orm.public.PlaceParking.aggregate((a) => ({ total: a.count() })).then(r => r.total);
  const capaciteMax = Number(totalPlaces) > 0 ? Number(totalPlaces) : 200; // Fallback à 200 si la base est vide

  const tauxOccupation = Math.round((Number(presentsSurSite) / capaciteMax) * 100);

  // 2. Entrées sur la période
  let queryEntrees = db.orm.public.Mouvement.where((m) => m.heure_arrivee.gte(Temporal.Instant.from(dateDebutFiltre.toISOString())));
  queryEntrees = queryEntrees.where((m) => m.heure_arrivee.lte(Temporal.Instant.from(dateFinFiltre.toISOString())));
  const entreesJour = await queryEntrees.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  // 3. Sorties sur la période
  let querySorties = db.orm.public.Mouvement.where((m) => m.heure_depart.gte(Temporal.Instant.from(dateDebutFiltre.toISOString())));
  querySorties = querySorties.where((m) => m.heure_depart.lte(Temporal.Instant.from(dateFinFiltre.toISOString())));
  const sortiesJour = await querySorties.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  // 4. Flux Horaire (Sur la période)
  const mouvementsJour = await queryEntrees.all();

  const fluxHoraire = Array.from({ length: 24 }, (_, i) => ({
    heure: `${i.toString().padStart(2, '0')}:00`,
    entrees: 0,
    sorties: 0
  }));

  const startInstant = Temporal.Instant.from(dateDebutFiltre.toISOString());
  const endInstant = Temporal.Instant.from(dateFinFiltre.toISOString());

  for (const m of mouvementsJour) {
    if (m.heure_arrivee) {
      const arrDate = new Date(m.heure_arrivee.epochMilliseconds);
      const h = arrDate.getUTCHours();
      const slot = fluxHoraire[h];
      if (slot) slot.entrees++;
    }
    if (m.heure_depart) {
      const depInstant = m.heure_depart as Temporal.Instant;
      if (Temporal.Instant.compare(depInstant, startInstant) >= 0 && Temporal.Instant.compare(depInstant, endInstant) <= 0) {
        const depDate = new Date(depInstant.epochMilliseconds);
        const h = depDate.getUTCHours();
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
  let queryEntreesPerso = db.orm.public.Mouvement.where({ type_entree: 'personnel' }).where((m) => m.heure_arrivee.gte(Temporal.Instant.from(dateDebutFiltre.toISOString())));
  queryEntreesPerso = queryEntreesPerso.where((m) => m.heure_arrivee.lte(Temporal.Instant.from(dateFinFiltre.toISOString())));
  const entreesPersonnelJour = await queryEntreesPerso.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  let queryEntreesVisit = db.orm.public.Mouvement.where({ type_entree: 'visiteur' }).where((m) => m.heure_arrivee.gte(Temporal.Instant.from(dateDebutFiltre.toISOString())));
  queryEntreesVisit = queryEntreesVisit.where((m) => m.heure_arrivee.lte(Temporal.Instant.from(dateFinFiltre.toISOString())));
  const entreesVisiteursJour = await queryEntreesVisit.aggregate((a) => ({ total: a.count() })).then(r => r.total);

  const entreesTotalMois = await db.orm.public.Mouvement
    .where((m) => m.heure_arrivee.gte(Temporal.Instant.from(startOfMonth.toISOString())))
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
