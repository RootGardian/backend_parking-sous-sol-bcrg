import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../prisma/db';

const JWT_SECRET = process.env.JWT_SECRET ?? 'default_secret';

// Extend Express Request object to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Accès refusé. Aucun token fourni.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Accès refusé. Token invalide.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    
    // Si l'utilisateur doit changer de mot de passe, bloquer toutes les requêtes sauf /change-password
    if (decoded.doit_changer_mdp && !req.path.includes('/change-password')) {
      res.status(403).json({
        error: 'Vous devez réinitialiser votre mot de passe pour continuer.',
        requires_password_change: true
      });
      return;
    }
    
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token invalide ou expiré.' });
  }
};

// Mapping entre les noms d'affichage et l'enum RoleEnum de Prisma
const roleMapping: Record<string, string> = {
  'Vigile': 'agent',
  'Superviseur': 'superviseur',
  'Administrateur': 'admin'
};

/**
 * Middleware d'autorisation basé sur les rôles.
 * @param allowedRoles Liste des rôles autorisés (ex: ['Vigile', 'Superviseur'])
 */
export const authorize = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Accès refusé. Utilisateur non identifié.' });
      return;
    }

    try {
      // Vérification en temps réel dans la base de données
      const utilisateur = await db.orm.public.Utilisateur.where({ id: req.user.id }).first();

      if (!utilisateur || !utilisateur.role) {
        res.status(403).json({ error: 'Accès interdit. Rôle non défini ou utilisateur introuvable.' });
        return;
      }

      // Utilisation du rôle en base (temps réel)
      const userRoles: string[] = Array.isArray(utilisateur.role) ? utilisateur.role : [utilisateur.role];
      
      // Mapper les rôles demandés vers les valeurs réelles de l'enum Prisma
      const mappedAllowedRoles = allowedRoles.map(role => roleMapping[role] || role);

      // Vérifier si l'utilisateur possède au moins un des rôles autorisés
      const hasPermission = userRoles.some(role => mappedAllowedRoles.includes(role));

      if (!hasPermission) {
        res.status(403).json({ error: 'Accès interdit. Vous n\'avez pas les droits nécessaires.' });
        return;
      }

      // Optionnel : on peut mettre à jour le rôle dans req.user pour la suite de la requête
      req.user.role = userRoles;

      next();
    } catch (error) {
      console.error('Erreur lors de la vérification des droits:', error);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la vérification des droits.' });
    }
  };
};
