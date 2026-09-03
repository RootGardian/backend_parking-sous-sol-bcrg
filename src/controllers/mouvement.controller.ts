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
  
  if (!agent.id_parking) {
    throw new AppError("Vous n'êtes assigné à aucun parking. Impossible d'enregistrer des mouvements.", 403);
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

      // Chercher une place visiteur libre dans le parking de l'agent
      const place = await tx.orm.public.PlaceParking
        .where({ est_visiteur: true, est_occupee: false, id_parking: agent.id_parking as number })
        .include('parking', p => p)
        .first();
      if (!place) {
        throw new AppError('Toutes les places visiteurs sont actuellement occupées.', 409);
      }
      id_place_parking = place.id;
      // @ts-ignore
      placeInfo = `Place Visiteur : ${place.numero} (${place.niveau} - ${place.parking?.nom})`;
      
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
      const place = await tx.orm.public.PlaceParking
        .where({ id_fonction: personnel.id_fonction as number })
        .include('parking', p => p)
        .first();
      
      if (!place) {
        throw new AppError("Aucune place de parking n'est assignée à la fonction de ce membre du personnel.", 404);
      }

      if (place.id_parking !== agent.id_parking) {
        throw new AppError(`Ce membre du personnel est assigné au parking ${place.parking?.nom}, vous ne pouvez pas l'enregistrer ici.`, 403);
      }

      if (place.est_occupee) {
        throw new AppError(`La place assignée à cette fonction (${place.numero}) est actuellement occupée !`, 409);
      }

      id_place_parking = place.id;
      // @ts-ignore
      placeInfo = `Place Personnel : ${place.numero} (${place.niveau} - ${place.parking?.nom})`;
      
      await tx.orm.public.PlaceParking.where({ id: place.id }).update({ est_occupee: true });

    } else {
      throw new AppError('type_entree invalide (doit être "personnel" ou "visiteur").', 400);
    }

    const mouvement = await tx.orm.public.Mouvement.create({
      id_vehicule,
      id_personnel,
      id_agent: agent.id,
      id_parking: agent.id_parking as number,
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
  // @ts-ignore
  const id_utilisateur = req.user.id;

  const agent = await db.orm.public.Agent.where({ id_utilisateur: id_utilisateur as number }).first();
  if (!agent) {
    throw new AppError("Utilisateur non autorisé en tant qu'agent.", 403);
  }

  if (!agent.id_parking) {
    throw new AppError("Vous n'êtes assigné à aucun parking. Impossible d'enregistrer des mouvements.", 403);
  }

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

  if (mouvement.id_place_parking) {
    const place = await db.orm.public.PlaceParking.where({ id: mouvement.id_place_parking }).first();
    if (place && place.id_parking !== agent.id_parking) {
      throw new AppError("Ce véhicule n'est pas dans votre parking, vous ne pouvez pas enregistrer sa sortie.", 403);
    }
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
        date_action: Temporal.Instant.from(new Date().toISOString())
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
    date_action: Temporal.Instant.from(new Date().toISOString())
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

export const getMouvementsPersonnel = async (req: Request, res: Response): Promise<void> => {
  const { date_debut, date_fin, statut } = req.query;
  
  let query = db.orm.public.Mouvement.where({ type_entree: 'personnel' });

  if (statut) {
    query = query.where({ statut: statut as 'sur_site' | 'hors_site' });
  } else {
    // Par défaut, comportement "sur-site" si on veut garder la logique d'origine,
    // mais vu qu'on filtre par date, on renvoie tout s'il n'y a pas de statut.
    // L'utilisateur a demandé de séparer la route sur-site, donc on peut filtrer 'sur_site'
    query = query.where({ statut: 'sur_site' });
  }

  const dateDebut = date_debut ? Temporal.Instant.from(date_debut as string) : undefined;
  const dateFin = date_fin ? Temporal.Instant.from(date_fin as string) : undefined;

  const mouvements = await query
    .include('vehicule', (v) => v.include('personnel', (p) => p.include('utilisateur', (u) => u)))
    .include('place_parking', p => p)
    .all();

  let filtered = mouvements;
  if (dateDebut || dateFin) {
    filtered = mouvements.filter(m => {
      const heure = m.heure_arrivee;
      if (dateDebut && Temporal.Instant.compare(heure, dateDebut) < 0) return false;
      if (dateFin && Temporal.Instant.compare(heure, dateFin) > 0) return false;
      return true;
    });
  }

  res.json(filtered);
};

export const getMouvementsVisiteur = async (req: Request, res: Response): Promise<void> => {
  const { date_debut, date_fin, statut } = req.query;
  
  let query = db.orm.public.Mouvement.where({ type_entree: 'visiteur' });

  if (statut) {
    query = query.where({ statut: statut as 'sur_site' | 'hors_site' });
  } else {
    query = query.where({ statut: 'sur_site' });
  }

  const dateDebut = date_debut ? Temporal.Instant.from(date_debut as string) : undefined;
  const dateFin = date_fin ? Temporal.Instant.from(date_fin as string) : undefined;

  const mouvements = await query
    .include('place_parking', p => p)
    .all();

  let filtered = mouvements;
  if (dateDebut || dateFin) {
    filtered = mouvements.filter(m => {
      const heure = m.heure_arrivee;
      if (dateDebut && Temporal.Instant.compare(heure, dateDebut) < 0) return false;
      if (dateFin && Temporal.Instant.compare(heure, dateFin) > 0) return false;
      return true;
    });
  }

  res.json(filtered);
};
