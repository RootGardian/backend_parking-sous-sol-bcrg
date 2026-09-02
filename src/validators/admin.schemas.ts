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
    niveau_parking: z.enum(['Sous_sol_1', 'Sous_sol_2']),
    numero_place: z.string().min(1, 'Le numéro de place est requis'),
  }).strict(),
});

export const ajouterPlaceVisiteurSchema = z.object({
  body: z.object({
    niveau_parking: z.enum(['Sous_sol_1', 'Sous_sol_2']),
    numero_place: z.string().min(1, 'Le numéro de place est requis'),
  }).strict(),
});
