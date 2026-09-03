import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';
import { Temporal } from '@js-temporal/polyfill';

/**
 * --- GESTION DES PARKINGS ---
 */

/**
 * Ajouter un nouveau parking
 */
export const ajouterParking = async (req: Request, res: Response): Promise<void> => {
  const { nom, adresse, nombre_niveaux, capacite_maximale } = req.body;

  if (!nom) {
    throw new AppError('Le nom du parking est obligatoire.', 400);
  }

  const existant = await db.orm.public.Parking.where({ nom }).first();
  if (existant) {
    throw new AppError('Un parking avec ce nom existe déjà.', 409);
  }

  const parking = await db.orm.public.Parking.create({
    nom,
    adresse: adresse || null,
    nombre_niveaux: nombre_niveaux || 0,
    capacite_maximale: capacite_maximale || null
  });

  // @ts-ignore
  const id_utilisateur = req.user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'CREATION_PARKING',
    cible: `Parking ${nom}`,
    details: adresse ? `Adresse: ${adresse}` : '',
    date_action: Temporal.Now.instant()
  });

  res.status(201).json({ message: 'Parking créé avec succès.', parking });
};

/**
 * Lister tous les parkings avec leurs places
 */
export const listerParkings = async (req: Request, res: Response): Promise<void> => {
  const parkings = await db.orm.public.Parking
    .include('places', p => p.include('fonction', f => f).orderBy(pl => pl.numero.asc()))
    .orderBy(p => p.nom.asc())
    .all();
  res.json(parkings);
};

/**
 * Modifier un parking
 */
export const modifierParking = async (req: Request, res: Response): Promise<void> => {
  const id_parking = Number(req.params.id);
  const { nom, adresse, nombre_niveaux, capacite_maximale } = req.body;

  const parking = await db.orm.public.Parking.where({ id: id_parking }).first();
  if (!parking) {
    throw new AppError('Parking introuvable.', 404);
  }

  if (nom && nom !== parking.nom) {
    const existant = await db.orm.public.Parking.where({ nom }).first();
    if (existant) {
      throw new AppError('Un parking avec ce nom existe déjà.', 409);
    }
  }

  await db.orm.public.Parking.where({ id: id_parking }).update({
    nom: nom || parking.nom,
    adresse: adresse !== undefined ? adresse : parking.adresse,
    nombre_niveaux: nombre_niveaux !== undefined ? nombre_niveaux : parking.nombre_niveaux,
    capacite_maximale: capacite_maximale !== undefined ? capacite_maximale : parking.capacite_maximale
  });

  // @ts-ignore
  const id_utilisateur = req.user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'MODIFICATION_PARKING',
    cible: `Parking ID ${id_parking}`,
    details: `Nouveau nom: ${nom || parking.nom}`,
    date_action: Temporal.Now.instant()
  });

  res.json({ message: 'Parking modifié avec succès.' });
};

/**
 * Supprimer un parking
 */
export const supprimerParking = async (req: Request, res: Response): Promise<void> => {
  const id_parking = Number(req.params.id);

  const parking = await db.orm.public.Parking.where({ id: id_parking }).first();
  if (!parking) {
    throw new AppError('Parking introuvable.', 404);
  }

  const placesAssociees = Number(await db.orm.public.PlaceParking.where({ id_parking }).aggregate((a) => ({ total: a.count() })).then(r => r.total));
  if (placesAssociees > 0) {
    throw new AppError("Impossible de supprimer ce parking car il contient des places. Supprimez les places d'abord.", 400);
  }

  await db.orm.public.Parking.where({ id: id_parking }).delete();

  // @ts-ignore
  const id_utilisateur = req.user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'SUPPRESSION_PARKING',
    cible: `Parking ${parking.nom}`,
    details: '',
    date_action: Temporal.Now.instant()
  });

  res.json({ message: 'Parking supprimé avec succès.' });
};


/**
 * --- GESTION DES PLACES ET FONCTIONS ---
 */

/**
 * Créer une fonction (qui crée automatiquement sa place de parking)
 */
export const creerFonctionEtPlace = async (req: Request, res: Response): Promise<void> => {
  const { nom_fonction, id_parking, niveau_parking, numero_place } = req.body; 

  if (!nom_fonction || !id_parking || !niveau_parking || !numero_place) {
    throw new AppError('Les champs nom_fonction, id_parking, niveau_parking et numero_place sont obligatoires.', 400);
  }

  const parking = await db.orm.public.Parking.where({ id: Number(id_parking) }).first();
  if (!parking) {
    throw new AppError('Le parking spécifié est introuvable.', 404);
  }

  // Vérifier si le numéro de place est déjà pris
  const placeExistante = await db.orm.public.PlaceParking.where({ numero: numero_place }).first();
  if (placeExistante) {
    throw new AppError(`Le numéro de place ${numero_place} est déjà utilisé.`, 409);
  }

  // Créer en transaction
  await db.transaction(async (tx) => {
    // Créer la fonction
    let fonction = await tx.orm.public.Fonction.where({ nom: nom_fonction }).first();
    if (!fonction) {
      fonction = await tx.orm.public.Fonction.create({
        nom: nom_fonction
      });
    }

    // Créer la place de parking assignée
    const place = await tx.orm.public.PlaceParking.create({
      numero: numero_place,
      niveau: niveau_parking,
      id_parking: parking.id,
      id_fonction: fonction.id,
      est_visiteur: false,
      est_occupee: false
    });

    // @ts-ignore
    const id_utilisateur = req.user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur,
      action: 'CREATION_FONCTION_PLACE',
      cible: `Fonction ${nom_fonction}`,
      details: `Création place ${numero_place} au ${niveau_parking} (${parking.nom})`,
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
  const personnelsAssocies = Number(await db.orm.public.Personnel.where({ id_fonction: Number(id_fonction) }).aggregate((a) => ({ total: a.count() })).then(r => r.total));
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
  const { id_parking, niveau_parking, numero_place } = req.body;

  if (!id_parking || !niveau_parking || !numero_place) {
    throw new AppError('Les champs id_parking, niveau_parking et numero_place sont obligatoires.', 400);
  }

  const parking = await db.orm.public.Parking.where({ id: Number(id_parking) }).first();
  if (!parking) {
    throw new AppError('Le parking spécifié est introuvable.', 404);
  }

  // Vérifier si le numéro de place est déjà pris
  const placeExistante = await db.orm.public.PlaceParking.where({ numero: numero_place }).first();
  if (placeExistante) {
    throw new AppError(`Le numéro de place ${numero_place} est déjà utilisé.`, 409);
  }

  const place = await db.orm.public.PlaceParking.create({
    numero: numero_place,
    niveau: niveau_parking,
    id_parking: parking.id,
    est_visiteur: true,
    est_occupee: false,
    id_fonction: null
  });

  // @ts-ignore
  const id_utilisateur = req.user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur,
    action: 'CREATION_PLACE_VISITEUR',
    cible: `Place ${numero_place}`,
    details: `Création place visiteur au ${niveau_parking} (${parking.nom})`,
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
 * Lister toutes les places de parking (avec leurs assignations et infos de parking)
 */
export const listerPlacesParking = async (req: Request, res: Response): Promise<void> => {
  const { id_parking } = req.query;

  let query = db.orm.public.PlaceParking
    .include('fonction', f => f)
    .include('parking', p => p);

  if (id_parking) {
    query = query.where({ id_parking: Number(id_parking) });
  }

  const places = await query
    .orderBy(p => p.numero.asc())
    .all();

  res.json(places);
};

/**
 * Lister toutes les fonctions
 */
export const listerFonctions = async (req: Request, res: Response): Promise<void> => {
  const { id_parking } = req.query;

  const fonctions = await db.orm.public.Fonction
    .include('places_parking', p => {
      let query = p.orderBy(pl => pl.numero.asc());
      if (id_parking) {
        query = query.where({ id_parking: Number(id_parking) });
      }
      return query;
    })
    .orderBy(f => f.nom.asc())
    .all();
    
  // Si on filtre par parking, on ne retourne que les fonctions qui ont au moins une place dans ce parking
  const result = id_parking 
    ? fonctions.filter(f => f.places_parking.length > 0)
    : fonctions;

  res.json(result);
};
