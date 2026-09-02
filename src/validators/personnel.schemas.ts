import { z } from 'zod';

export const addVehiculeSchema = z.object({
  body: z.object({
    numero_plaque: z.string().min(1, 'La plaque est requise'),
    plaque: z.string().optional(), // Alternative parfois utilisée dans l'API
    marque: z.string().optional(),
    couleur: z.string().optional(),
  }).strict(),
});
