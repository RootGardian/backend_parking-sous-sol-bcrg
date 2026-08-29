import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';

// Setup pepper and jwt secret
const PEPPER = process.env.PASSWORD_PEPPER ?? 'default_pepper';
const JWT_SECRET = process.env.JWT_SECRET ?? 'default_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { matricule, mot_de_passe } = req.body;

  if (!matricule || !mot_de_passe) {
    throw new AppError('Le matricule et le mot de passe sont requis.', 400);
  }

  // Recherche de l'utilisateur par matricule
  const utilisateur = await db.orm.public.Utilisateur.where({ matricule }).first();

  if (!utilisateur) {
    throw new AppError('Identifiants invalides.', 401);
  }

  // Vérification du mot de passe avec le pepper
  const pepperedPassword = mot_de_passe + PEPPER;
  const isPasswordValid = await bcrypt.compare(pepperedPassword, utilisateur.mot_de_passe ?? '');

  if (!isPasswordValid) {
    throw new AppError('Identifiants invalides.', 401);
  }

  // Récupération de l'agent si l'utilisateur en est un
  const agent = await db.orm.public.Agent.where({ id_utilisateur: utilisateur.id }).first();

  // Création du token
  const tokenData = {
    id: utilisateur.id,
    matricule: utilisateur.matricule,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    role: utilisateur.role,
    id_agent: agent?.id ?? null,
  };

  const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  res.status(200).json({
    message: 'Connexion réussie',
    token,
    utilisateur: {
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role
    }
  });
};
