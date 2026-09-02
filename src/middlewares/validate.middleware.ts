import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as any;
      if (validated.body) Object.assign(req.body, validated.body);
      if (validated.query) Object.assign(req.query, validated.query);
      if (validated.params) Object.assign(req.params, validated.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extraction sécurisée des erreurs Zod
        const issues = error.issues || (error as any).errors || [];
        const formattedErrors = issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          status: 'error',
          message: 'Erreur de validation des données',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
};
