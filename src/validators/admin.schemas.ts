import { z } from 'zod';

export const ajouterPersonnelSchema = z.object({
  body: z.object({
    nom: z.string().min(1, 'Le nom est requis'),
    prenom: z.string().min(1, 'Le prénom est requis'),
    matricule: z.string().min(1, 'Le matricule est requis'),
    id_fonction: z.number().int().optional(),
    fonction: z.string().optional(),
    numero_plaque: z.string().optional(),
  }).strict(),
});

export const modifierPersonnelSchema = z.object({
  body: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    matricule: z.string().optional(),
    id_fonction: z.number().int().optional(),
  }).strict(),
});

export const ajouterUtilisateurSchema = z.object({
  body: z.object({
    nom: z.string().min(1, 'Le nom est requis'),
    prenom: z.string().min(1, 'Le prénom est requis'),
    matricule: z.string().min(1, 'Le matricule est requis'),
    role: z.enum(['Agent', 'Supervision', 'Administrateur']),
  }).strict(),
});

const passwordValidation = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

export const modifierUtilisateurSchema = z.object({
  body: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    matricule: z.string().optional(),
    role: z.enum(['Agent', 'Supervision', 'Administrateur']).optional(),
    mot_de_passe: passwordValidation.optional(),
  }).strict(),
});

export const creerFonctionEtPlaceSchema = z.object({
  body: z.object({
    nom_fonction: z.string().min(1, 'Le nom de la fonction est requis'),
    id_parking: z.number().int({ message: "L'identifiant du parking est requis" }),
    niveau_parking: z.string().min(1, 'Le niveau est requis'),
    numero_place: z.string().min(1, 'Le numéro de place est requis'),
  }).strict(),
});

export const ajouterPlaceVisiteurSchema = z.object({
  body: z.object({
    id_parking: z.number().int({ message: "L'identifiant du parking est requis" }),
    niveau_parking: z.string().min(1, 'Le niveau est requis'),
    numero_place: z.string().min(1, 'Le numéro de place est requis'),
  }).strict(),
});

export const ajouterParkingSchema = z.object({
  body: z.object({
    nom: z.string().min(1, 'Le nom du parking est requis'),
    adresse: z.string().optional(),
    nombre_niveaux: z.number().int().min(0).optional(),
    capacite_maximale: z.number().int().min(1).optional(),
  }).strict(),
});

export const modifierParkingSchema = z.object({
  body: z.object({
    nom: z.string().optional(),
    adresse: z.string().optional(),
    nombre_niveaux: z.number().int().min(0).optional(),
    capacite_maximale: z.number().int().min(1).optional(),
  }).strict(),
});

