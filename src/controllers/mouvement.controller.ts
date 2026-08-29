import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

const QUOTA_DIRECTEURS_GENERAUX = 29;
const QUOTA_GOUVERNEURS = 3;
const QUOTA_VISITEURS_GOUVERNEURS = 3;

// Helper pour vérifier si le personnel a une fonction de gouverneur
const isGouverneur = (fonctions: readonly string[] | string[] | undefined | null): boolean => {
  if (!fonctions) return false;
  return fonctions.some(f => 
    ['Gouverneur', '1er Vice-Gouverneur', '2e Vice-Gouverneur', 'Vice_Gouverneur_1', 'Vice_Gouverneur_2'].includes(f)
  );
};

export const getParkingStatut = async (req: Request, res: Response): Promise<void> => {
  const visiteursSurSite = Number(await db.orm.public.Mouvement
    .where({ statut: 'sur_site', type_entree: 'visiteur' })
    .count());

  const mouvementsPersonnel = await db.orm.public.Mouvement
    .where({ statut: 'sur_site', type_entree: 'personnel' })
    .include('vehicule', (v) => v.include('personnel', (p) => p))
    .all();

  let gouverneursSurSite = 0;
  let directeursSurSite = 0;

  for (const m of mouvementsPersonnel) {
    const fonctions = m.vehicule?.personnel?.fonction || [];
    if (isGouverneur(fonctions as readonly string[])) {
      gouverneursSurSite++;
    } else {
      directeursSurSite++;
    }
  }

  res.json({
    visiteurs_gouverneurs: {
      en_stationnement: visiteursSurSite,
      quota_total: QUOTA_VISITEURS_GOUVERNEURS,
      places_disponibles: Math.max(0, QUOTA_VISITEURS_GOUVERNEURS - visiteursSurSite)
    },
    directeurs_generaux: {
      en_stationnement: directeursSurSite,
      quota_total: QUOTA_DIRECTEURS_GENERAUX,
      places_disponibles: Math.max(0, QUOTA_DIRECTEURS_GENERAUX - directeursSurSite)
    },
    gouverneurs: {
      en_stationnement: gouverneursSurSite,
      quota_total: QUOTA_GOUVERNEURS,
      places_disponibles: Math.max(0, QUOTA_GOUVERNEURS - gouverneursSurSite)
    },
    total_sur_site: visiteursSurSite + directeursSurSite + gouverneursSurSite
  });
};

export const enregistrerEntree = async (req: Request, res: Response): Promise<void> => {
  const { id_vehicule, type_entree, id_personnel_visite, observation } = req.body;
  // @ts-ignore req.user est set par le middleware verifyToken
  const id_utilisateur = req.user.id;

  // Récupérer l'agent correspondant à l'utilisateur
  const agent = await db.orm.public.Agent.where({ id_utilisateur: id_utilisateur as number }).first();
  if (!agent) {
    throw new AppError('Utilisateur non autorisé en tant qu\'agent.', 403);
  }

  if (type_entree === 'visiteur') {
    const visiteursSurSite = Number(await db.orm.public.Mouvement
      .where({ statut: 'sur_site', type_entree: 'visiteur' })
      .count());

    if (visiteursSurSite >= QUOTA_VISITEURS_GOUVERNEURS) {
      throw new AppError('Quota de visiteurs pour les gouverneurs atteint. Plus de places disponibles.', 409);
    }
    
    if (!id_personnel_visite) {
      throw new AppError('Le champ id_personnel_visite est obligatoire pour un visiteur.', 400);
    }

    const personnelVisite = await db.orm.public.Personnel.where({ id: id_personnel_visite as number }).first();
    if (!personnelVisite) {
      throw new AppError('Personnel visité introuvable.', 404);
    }
    
    if (!isGouverneur(personnelVisite.fonction as readonly string[])) {
      throw new AppError('Seuls les gouverneurs peuvent recevoir des visiteurs dans ce parking.', 403);
    }
  } else if (type_entree === 'personnel') {
    if (!id_vehicule) {
      throw new AppError('Le champ id_vehicule est obligatoire pour le personnel.', 400);
    }
    
    const vehicule = await db.orm.public.Vehicule
      .where({ id: id_vehicule as number })
      .include('personnel', p => p)
      .first();
      
    if (!vehicule || !vehicule.personnel) {
      throw new AppError('Véhicule ou personnel introuvable.', 404);
    }
    
    // Vérifier si le véhicule n'est pas déjà sur site
    const dejaSurSite = await db.orm.public.Mouvement
      .where({ id_vehicule: id_vehicule as number, statut: 'sur_site' })
      .first();
      
    if (dejaSurSite) {
      throw new AppError('Ce véhicule est déjà enregistré comme étant sur le site.', 409);
    }

    const fonctions = vehicule.personnel.fonction || [];
    const personnelIsGouverneur = isGouverneur(fonctions as readonly string[]);
    
    // Vérification des quotas pour le personnel
    const mouvementsPersonnel = await db.orm.public.Mouvement
      .where({ statut: 'sur_site', type_entree: 'personnel' })
      .include('vehicule', (v) => v.include('personnel', (p) => p))
      .all();

    let gouverneursSurSite = 0;
    let directeursSurSite = 0;

    for (const m of mouvementsPersonnel) {
      const fns = m.vehicule?.personnel?.fonction || [];
      if (isGouverneur(fns as readonly string[])) {
        gouverneursSurSite++;
      } else {
        directeursSurSite++;
      }
    }

    if (personnelIsGouverneur && gouverneursSurSite >= QUOTA_GOUVERNEURS) {
      throw new AppError('Quota de stationnement pour les gouverneurs atteint.', 409);
    }
    
    if (!personnelIsGouverneur && directeursSurSite >= QUOTA_DIRECTEURS_GENERAUX) {
      throw new AppError('Quota de stationnement pour les directeurs atteint.', 409);
    }
  } else {
    throw new AppError('type_entree invalide (doit être "personnel" ou "visiteur").', 400);
  }

  const mouvement = await db.orm.public.Mouvement.create({
    id_vehicule: id_vehicule || null,
    id_agent: agent.id,
    statut: 'sur_site',
    heure_arrivee: new Date(),
    type_entree: type_entree as any,
    id_personnel_visite: id_personnel_visite || null,
    observation: observation || null
  });

  res.status(201).json({ message: 'Entrée enregistrée avec succès.', mouvement });
};

export const enregistrerSortie = async (req: Request, res: Response): Promise<void> => {
  const { id_passage } = req.params;
  const { observation } = req.body;

  const mouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).first();

  if (!mouvement) {
    throw new AppError('Mouvement introuvable.', 404);
  }

  if (mouvement.statut === 'hors_site') {
    throw new AppError('Ce véhicule est déjà sorti.', 400);
  }

  const updatedMouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).update({
    statut: 'hors_site',
    heure_depart: new Date(),
    observation: observation ? observation : mouvement.observation
  });

  res.json({ message: 'Sortie enregistrée avec succès.', mouvement: updatedMouvement });
};

export const corrigerMouvement = async (req: Request, res: Response): Promise<void> => {
  const { id_passage } = req.params;
  const { id_vehicule, observation, annuler } = req.body;

  const mouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).first();

  if (!mouvement) {
    throw new AppError('Mouvement introuvable.', 404);
  }

  if (annuler === true) {
    // Suppression de l'entrée par le superviseur
    await db.orm.public.Mouvement.where({ id: Number(id_passage) }).delete();
    
    // Log Audit
    // @ts-ignore
    const id_utilisateur = req.user.userId;
    await db.orm.public.AuditLog.create({
      id_utilisateur,
      action: 'SUPPRESSION_MOUVEMENT',
      cible: `Mouvement #${id_passage}`,
      details: 'Annulation d\'un mouvement enregistré',
      date_action: new Date()
    });

    res.json({ message: 'Le mouvement a été annulé (supprimé) avec succès.' });
    return;
  }

  const updatedData: any = {};
  if (id_vehicule !== undefined) updatedData.id_vehicule = id_vehicule;
  if (observation !== undefined) updatedData.observation = observation;

  if (Object.keys(updatedData).length === 0) {
    throw new AppError('Aucune donnée à mettre à jour.', 400);
  }

  const updatedMouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).update(updatedData);

  // Log Audit
  // @ts-ignore
  const id_utilisateur = req.user.userId;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'CORRECTION_MOUVEMENT',
    cible: `Mouvement #${id_passage}`,
    details: JSON.stringify(updatedData),
    date_action: new Date()
  });

  res.json({ message: 'Mouvement corrigé avec succès.', mouvement: updatedMouvement });
};

export const getVehiculesAutorises = async (req: Request, res: Response): Promise<void> => {
  const personnels = await db.orm.public.Personnel.include('vehicules', (v) => v).include('utilisateur', (u) => u).all();
  
  // Exclure le personnel désactivé (soft delete)
  const actifs = personnels.filter(p => p.utilisateur?.est_actif !== false);
  
  res.json(actifs);
};

export const getGouverneursAutorises = async (req: Request, res: Response): Promise<void> => {
  const personnels = await db.orm.public.Personnel.include('utilisateur', (u) => u).all();
  
  // On filtre pour ne garder que les gouverneurs ACTIFS
  const gouverneurs = personnels.filter(p => 
    p.utilisateur?.est_actif !== false && 
    isGouverneur(p.fonction as readonly string[])
  );
  
  res.json(gouverneurs);
};

export const getPersonnelSurSite = async (req: Request, res: Response): Promise<void> => {
  const mouvementsSurSite = await db.orm.public.Mouvement
    .where({ statut: 'sur_site', type_entree: 'personnel' })
    .include('vehicule', (v) => v.include('personnel', (p) => p.include('utilisateur', (u) => u)))
    .all();
  res.json(mouvementsSurSite);
};

export const getVisiteursSurSite = async (req: Request, res: Response): Promise<void> => {
  const mouvementsSurSite = await db.orm.public.Mouvement
    .where({ statut: 'sur_site', type_entree: 'visiteur' })
    .include('personnel_visite', (p) => p.include('utilisateur', (u) => u))
    .all();
  res.json(mouvementsSurSite);
};
