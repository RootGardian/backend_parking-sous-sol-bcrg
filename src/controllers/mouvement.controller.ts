import type { Request, Response } from 'express';
import { Temporal } from '@js-temporal/polyfill';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

export const getParkingStatut = async (req: Request, res: Response): Promise<void> => {
  const places = await db.orm.public.PlaceParking.all();
  
  const placesVisiteurs = places.filter(p => p.est_visiteur);
  const placesPersonnel = places.filter(p => !p.est_visiteur);

  const visiteursOccupes = placesVisiteurs.filter(p => p.est_occupee).length;
  const personnelOccupes = placesPersonnel.filter(p => p.est_occupee).length;

  res.json({
    visiteurs: {
      total: placesVisiteurs.length,
      occupees: visiteursOccupes,
      disponibles: placesVisiteurs.length - visiteursOccupes
    },
    personnel: {
      total: placesPersonnel.length,
      occupees: personnelOccupes,
      disponibles: placesPersonnel.length - personnelOccupes
    },
    total: {
      places: places.length,
      occupees: visiteursOccupes + personnelOccupes
    }
  });
};

export const enregistrerEntree = async (req: Request, res: Response): Promise<void> => {
  const { type_entree, matricule_personnel, numero_plaque, matricule_visite, observation } = req.body;
  // @ts-ignore req.user est set par le middleware verifyToken
  const id_utilisateur = req.user.id;

  const agent = await db.orm.public.Agent.where({ id_utilisateur: id_utilisateur as number }).first();
  if (!agent) {
    throw new AppError("Utilisateur non autorisé en tant qu'agent.", 403);
  }

  let id_vehicule: number | null = null;
  let id_personnel: number | null = null;
  let id_personnel_visite: number | null = null;
  let id_place_parking: number | null = null;
  let placeInfo = '';

  await db.transaction(async (tx) => {
    if (type_entree === 'visiteur') {
      if (!numero_plaque) {
        throw new AppError('Le champ numero_plaque est obligatoire pour un visiteur.', 400);
      }

      let v = await tx.orm.public.Vehicule.where({ numero_plaque }).first();
      if (!v) {
        v = await tx.orm.public.Vehicule.create({
          numero_plaque,
          type: 'visiteur'
        });
      }
      id_vehicule = v.id;

      // Chercher une place visiteur libre
      const place = await tx.orm.public.PlaceParking.where({ est_visiteur: true, est_occupee: false }).first();
      if (!place) {
        throw new AppError('Toutes les places visiteurs sont actuellement occupées.', 409);
      }
      id_place_parking = place.id;
      placeInfo = `Place Visiteur : ${place.numero} (${place.niveau})`;
      
      await tx.orm.public.PlaceParking.where({ id: place.id }).update({ est_occupee: true });

    } else if (type_entree === 'personnel') {
      if (!matricule_personnel && !numero_plaque) {
        throw new AppError('Le champ matricule_personnel ou numero_plaque est obligatoire pour le personnel.', 400);
      }
      
      let vehicule = null;
      let personnel = null;

      if (numero_plaque) {
        vehicule = await tx.orm.public.Vehicule
          .where({ numero_plaque })
          .include('personnel', p => p)
          .first();
        
        if (vehicule) {
          id_vehicule = vehicule.id;
          personnel = vehicule.personnel;
        }
      }
      
      if (!personnel && matricule_personnel) {
        const utilisateur = await tx.orm.public.Utilisateur
          .where({ matricule: matricule_personnel })
          .include('personnel', p => p.include('vehicules', v => v))
          .first();
        
        personnel = utilisateur?.personnel;

        if (personnel && personnel.vehicules && personnel.vehicules.length > 0) {
          id_vehicule = personnel.vehicules[0]?.id as number;
        }
      }
        
      if (!personnel) {
        throw new AppError('Véhicule ou personnel introuvable.', 404);
      }
      
      id_personnel = personnel.id as number;
      
      if (id_vehicule) {
        const dejaSurSite = await tx.orm.public.Mouvement
          .where({ id_vehicule: id_vehicule as number, statut: 'sur_site' })
          .first();
          
        if (dejaSurSite) {
          throw new AppError('Ce véhicule est déjà enregistré comme étant sur le site.', 409);
        }
      } else {
        const dejaSurSite = await tx.orm.public.Mouvement
          .where({ id_personnel_visite: id_personnel as number, statut: 'sur_site', id_vehicule: null })
          .first();
          
        if (dejaSurSite) {
          throw new AppError('Ce membre du personnel est déjà enregistré comme étant sur le site.', 409);
        }
      }

      if (!personnel.id_fonction) {
        throw new AppError("Ce membre du personnel n'a aucune fonction définie. Impossible de lui assigner une place.", 400);
      }

      // Chercher la place assignée à cette fonction
      const place = await tx.orm.public.PlaceParking.where({ id_fonction: personnel.id_fonction as number }).first();
      
      if (!place) {
        throw new AppError("Aucune place de parking n'est assignée à la fonction de ce membre du personnel.", 404);
      }

      if (place.est_occupee) {
        throw new AppError(`La place assignée à cette fonction (${place.numero}) est actuellement occupée !`, 409);
      }

      id_place_parking = place.id;
      placeInfo = `Place Personnel : ${place.numero} (${place.niveau})`;
      
      await tx.orm.public.PlaceParking.where({ id: place.id }).update({ est_occupee: true });

    } else {
      throw new AppError('type_entree invalide (doit être "personnel" ou "visiteur").', 400);
    }

    const mouvement = await tx.orm.public.Mouvement.create({
      id_vehicule,
      id_personnel,
      id_agent: agent.id,
      id_place_parking,
      statut: 'sur_site',
      heure_arrivee: Temporal.Now.instant(),
      type_entree: type_entree as any,
      id_personnel_visite,
      observation: observation || null
    });

    res.status(201).json({ message: `Entrée enregistrée avec succès. ${placeInfo}`, mouvement });
  });
};

export const enregistrerSortie = async (req: Request, res: Response): Promise<void> => {
  const { observation, matricule_personnel, numero_plaque, id_passage } = req.body;

  let mouvement = null;

  if (id_passage) {
    mouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).first();
  } else if (numero_plaque) {
    const vehicule = await db.orm.public.Vehicule.where({ numero_plaque }).first();
    if (vehicule) {
      mouvement = await db.orm.public.Mouvement
        .where({ id_vehicule: vehicule.id, statut: 'sur_site' })
        .first();
    }
  } else if (matricule_personnel) {
    const utilisateur = await db.orm.public.Utilisateur
      .where({ matricule: matricule_personnel })
      .include('personnel', p => p)
      .first();
    
    if (utilisateur?.personnel) {
      mouvement = await db.orm.public.Mouvement
        .where({ id_personnel_visite: utilisateur.personnel.id as number, statut: 'sur_site' })
        .first();
    }
  }

  if (!mouvement) {
    throw new AppError('Mouvement introuvable ou déjà hors site.', 404);
  }

  if (mouvement.statut === 'hors_site') {
    throw new AppError('Ce véhicule ou personnel est déjà sorti.', 400);
  }

  await db.transaction(async (tx) => {
    // 1. Libérer la place de parking si une place était assignée
    if (mouvement.id_place_parking) {
      await tx.orm.public.PlaceParking.where({ id: mouvement.id_place_parking }).update({ est_occupee: false });
    }

    // 2. Mettre à jour le mouvement
    const updatedMouvement = await tx.orm.public.Mouvement.where({ id: mouvement.id as number }).update({
      statut: 'hors_site',
      heure_depart: Temporal.Now.instant(),
      observation: observation ? observation : mouvement.observation
    });

    res.json({ message: 'Sortie enregistrée avec succès. La place de parking a été libérée.', mouvement: updatedMouvement });
  });
};

export const corrigerMouvement = async (req: Request, res: Response): Promise<void> => {
  const { id_passage } = req.params;
  const { id_vehicule, observation, annuler, heure_arrivee, heure_depart, statut } = req.body;

  const mouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).first();

  if (!mouvement) {
    throw new AppError('Mouvement introuvable.', 404);
  }

  if (annuler === true) {
    await db.transaction(async (tx) => {
      if (mouvement.id_place_parking && mouvement.statut === 'sur_site') {
        await tx.orm.public.PlaceParking.where({ id: mouvement.id_place_parking }).update({ est_occupee: false });
      }
      await tx.orm.public.Mouvement.where({ id: Number(id_passage) }).delete();
      
      // @ts-ignore
      const id_utilisateur = req.user.id;
      await tx.orm.public.AuditLog.create({
        id_utilisateur,
        action: 'SUPPRESSION_MOUVEMENT',
        cible: `Mouvement #${id_passage}`,
        details: "Annulation d'un mouvement enregistré et libération de la place.",
        date_action: new Date()
      });
    });

    res.json({ message: 'Le mouvement a été annulé (supprimé) et la place libérée avec succès.' });
    return;
  }

  const updatedData: any = {};
  if (id_vehicule !== undefined) updatedData.id_vehicule = id_vehicule;
  if (observation !== undefined) updatedData.observation = observation;
  if (heure_arrivee !== undefined) updatedData.heure_arrivee = Temporal.Instant.from(heure_arrivee);
  if (heure_depart !== undefined) updatedData.heure_depart = heure_depart ? Temporal.Instant.from(heure_depart) : null;
  if (statut !== undefined) updatedData.statut = statut;

  if (Object.keys(updatedData).length === 0) {
    throw new AppError('Aucune donnée à mettre à jour.', 400);
  }

  const updatedMouvement = await db.orm.public.Mouvement.where({ id: Number(id_passage) }).update(updatedData);

  // @ts-ignore
  const id_utilisateur = req.user.id;
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
  const personnels = await db.orm.public.Personnel
    .include('vehicules', (v) => v)
    .include('utilisateur', (u) => u)
    .include('fonction', (f) => f)
    .all();
  
  const autorises = personnels.filter(p => p.utilisateur?.est_actif !== false);
  res.json(autorises);
};

export const getPersonnesSurSite = async (req: Request, res: Response): Promise<void> => {
  const { type } = req.query; // 'personnel' ou 'visiteur'
  
  let query = db.orm.public.Mouvement.where({ statut: 'sur_site' });

  if (type === 'personnel' || type === 'visiteur') {
    query = query.where({ type_entree: type as 'personnel' | 'visiteur' });
  }

  const mouvementsSurSite = await query
    .include('vehicule', (v) => v.include('personnel', (p) => p.include('utilisateur', (u) => u)))
    .include('place_parking', p => p)
    .all();

  res.json(mouvementsSurSite);
};
