import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    matricule: z.string().min(1, 'Le matricule est requis'),
    mot_de_passe: z.string().min(1, 'Le mot de passe est requis'),
  }).strict(),
});

const passwordValidation = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

export const changePasswordSchema = z.object({
  body: z.object({
    nouveau_mot_de_passe: passwordValidation,
  }).strict(),
});
