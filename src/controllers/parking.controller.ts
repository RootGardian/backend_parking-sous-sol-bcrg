import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';
import { Temporal } from '@js-temporal/polyfill';

const MAX_PLACES_SS1 = 20;
const MAX_PLACES_SS2 = 15;
const MAX_PLACES_TOTAL = 35;

/**
 * Helper : Vérifie s'il reste de la place sur le niveau demandé
 */
const verifierDisponibiliteCreationPlace = async (niveau: 'Sous_sol_1' | 'Sous_sol_2') => {
  const totalPlaces = Number(await db.orm.public.PlaceParking.count());
  if (totalPlaces >= MAX_PLACES_TOTAL) {
    throw new AppError(`Le parking est plein (limite absolue de ${MAX_PLACES_TOTAL} places atteinte).`, 400);
  }

  const countNiveau = Number(await db.orm.public.PlaceParking.where({ niveau }).count());
  if (niveau === 'Sous_sol_1' && countNiveau >= MAX_PLACES_SS1) {
    throw new AppError(`Le niveau Sous_sol_1 est plein (${MAX_PLACES_SS1} places max).`, 400);
  }
  if (niveau === 'Sous_sol_2' && countNiveau >= MAX_PLACES_SS2) {
    throw new AppError(`Le niveau Sous_sol_2 est plein (${MAX_PLACES_SS2} places max).`, 400);
  }
};

/**
 * Créer une fonction (qui crée automatiquement sa place de parking)
 */
export const creerFonctionEtPlace = async (req: Request, res: Response): Promise<void> => {
  const { nom_fonction, niveau_parking, numero_place } = req.body; // niveau_parking: 'Sous_sol_1' | 'Sous_sol_2'

  if (!nom_fonction || !niveau_parking || !numero_place) {
    throw new AppError('Les champs nom_fonction, niveau_parking et numero_place sont obligatoires.', 400);
  }

  if (niveau_parking !== 'Sous_sol_1' && niveau_parking !== 'Sous_sol_2') {
    throw new AppError('Le niveau_parking doit être "Sous_sol_1" ou "Sous_sol_2".', 400);
  }

  // Vérifier la limite de places
  await verifierDisponibiliteCreationPlace(niveau_parking);

  // Vérifier si le numéro de place est déjà pris
  const placeExistante = await db.orm.public.PlaceParking.where({ numero: numero_place }).first();
  if (placeExistante) {
    throw new AppError(`Le numéro de place ${numero_place} est déjà utilisé.`, 409);
  }

  // Créer en transaction
  await db.transaction(async (tx) => {
    // Créer la fonction
    const fonction = await tx.orm.public.Fonction.create({
      nom: nom_fonction
    });

    // Créer la place de parking assignée
    const place = await tx.orm.public.PlaceParking.create({
      numero: numero_place,
      niveau: niveau_parking,
      id_fonction: fonction.id,
      est_visiteur: false,
      est_occupee: false
    });

    // Audit log
    // @ts-ignore
    const id_utilisateur = req.user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur,
      action: 'CREATION_FONCTION_PLACE',
      cible: `Fonction ${nom_fonction}`,
      details: `Création de la fonction et assignation de la place ${numero_place} (${niveau_parking})`,
      date_action: Temporal.Now.instant()
    });

    res.status(201).json({ 
      message: 'Fonction et place de parking créées avec succès.', 
      fonction, 
      place 
    });
  });
};

/**
 * Supprimer une fonction (libère sa place de parking)
 */
export const supprimerFonction = async (req: Request, res: Response): Promise<void> => {
  const { id_fonction } = req.params;

  const fonction = await db.orm.public.Fonction.where({ id: Number(id_fonction) }).first();
  if (!fonction) {
    throw new AppError('Fonction introuvable.', 404);
  }

  // Vérifier s'il y a du personnel encore assigné à cette fonction
  const personnelsAssocies = Number(await db.orm.public.Personnel.where({ id_fonction: Number(id_fonction) }).count());
  if (personnelsAssocies > 0) {
    throw new AppError('Impossible de supprimer cette fonction car du personnel y est encore assigné.', 400);
  }

  await db.transaction(async (tx) => {
    // Libérer la place de parking
    const place = await tx.orm.public.PlaceParking.where({ id_fonction: Number(id_fonction) }).first();
    if (place) {
      await tx.orm.public.PlaceParking.where({ id: place.id }).update({
        id_fonction: null
      });
    }

    // Supprimer la fonction
    await tx.orm.public.Fonction.where({ id: Number(id_fonction) }).delete();

    // Audit log
    // @ts-ignore
    const id_utilisateur = req.user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur,
      action: 'SUPPRESSION_FONCTION',
      cible: `Fonction ${fonction.nom}`,
      details: `Suppression de la fonction et libération de sa place de parking`,
      date_action: Temporal.Now.instant()
    });
  });

  res.json({ message: 'Fonction supprimée et place libérée avec succès.' });
};

/**
 * Ajouter une place visiteur
 */
export const ajouterPlaceVisiteur = async (req: Request, res: Response): Promise<void> => {
  const { niveau_parking, numero_place } = req.body;

  if (!niveau_parking || !numero_place) {
    throw new AppError('Les champs niveau_parking et numero_place sont obligatoires.', 400);
  }

  if (niveau_parking !== 'Sous_sol_1' && niveau_parking !== 'Sous_sol_2') {
    throw new AppError('Le niveau_parking doit être "Sous_sol_1" ou "Sous_sol_2".', 400);
  }

  // Vérifier la limite de places
  await verifierDisponibiliteCreationPlace(niveau_parking);

  // Vérifier si le numéro de place est déjà pris
  const placeExistante = await db.orm.public.PlaceParking.where({ numero: numero_place }).first();
  if (placeExistante) {
    throw new AppError(`Le numéro de place ${numero_place} est déjà utilisé.`, 409);
  }

  const place = await db.orm.public.PlaceParking.create({
    numero: numero_place,
    niveau: niveau_parking,
    est_visiteur: true,
    est_occupee: false,
    id_fonction: null
  });

  // Audit log
  // @ts-ignore
  const id_utilisateur = req.user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'CREATION_PLACE_VISITEUR',
    cible: `Place ${numero_place}`,
    details: `Création d'une place visiteur au ${niveau_parking}`,
    date_action: Temporal.Now.instant()
  });

  res.status(201).json({ message: 'Place visiteur ajoutée avec succès.', place });
};

/**
 * Supprimer une place visiteur
 */
export const supprimerPlaceVisiteur = async (req: Request, res: Response): Promise<void> => {
  const { id_place } = req.params;

  const place = await db.orm.public.PlaceParking.where({ id: Number(id_place) }).first();
  if (!place) {
    throw new AppError('Place de parking introuvable.', 404);
  }

  if (!place.est_visiteur) {
    throw new AppError('Impossible de supprimer cette place car elle est assignée à une fonction.', 400);
  }

  if (place.est_occupee) {
    throw new AppError('Impossible de supprimer cette place car elle est actuellement occupée.', 409);
  }

  await db.orm.public.PlaceParking.where({ id: Number(id_place) }).delete();

  // Audit log
  // @ts-ignore
  const id_utilisateur = req.user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'SUPPRESSION_PLACE_VISITEUR',
    cible: `Place ${place.numero}`,
    details: `Suppression de la place visiteur ${place.numero}`,
    date_action: Temporal.Now.instant()
  });

  res.json({ message: 'Place visiteur supprimée avec succès.' });
};

/**
 * Lister toutes les places de parking (avec leurs assignations)
 */
export const listerPlacesParking = async (req: Request, res: Response): Promise<void> => {
  const places = await db.orm.public.PlaceParking
    .include('fonction', f => f)
    .all();

  res.json(places);
};

/**
 * Lister toutes les fonctions
 */
export const listerFonctions = async (req: Request, res: Response): Promise<void> => {
  const fonctions = await db.orm.public.Fonction
    .include('places_parking', p => p)
    .all();
    
  res.json(fonctions);
};
