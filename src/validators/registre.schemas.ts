import { z } from 'zod';

export const enregistrerEntreeSchema = z.object({
  body: z.object({
    type_entree: z.preprocess((val) => {
      if (typeof val !== 'string') return val;
      const lower = val.toLowerCase();
      if (lower === 'p' || lower === 'personnel') return 'personnel';
      if (lower === 'v' || lower === 'visiteur') return 'visiteur';
      return lower;
    }, z.enum(['personnel', 'visiteur'])),
    matricule_personnel: z.string().optional(),
    numero_plaque: z.string().optional(),
    matricule_visite: z.string().optional(),
    observation: z.string().optional(),
  }).strict(),
});

export const enregistrerSortieSchema = z.object({
  body: z.object({
    observation: z.string().optional(),
    matricule_personnel: z.string().optional(),
    numero_plaque: z.string().optional(),
    id_passage: z.number().int().optional(),
  }).strict(),
});

export const corrigerMouvementSchema = z.object({
  body: z.object({
    id_vehicule: z.number().int().optional().nullable(),
    observation: z.string().optional(),
    annuler: z.boolean().optional(),
    heure_arrivee: z.string().datetime().optional(), // format ISO requis si fourni
    heure_depart: z.string().datetime().optional().nullable(),
    statut: z.enum(['Present', 'Termine', 'Annule']).optional(),
  }).strict(),
});
