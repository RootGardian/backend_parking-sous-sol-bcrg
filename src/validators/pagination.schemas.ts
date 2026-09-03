import { z } from 'zod';

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }).passthrough(), // Permet de conserver les autres query params comme date_debut, statut, etc.
});
