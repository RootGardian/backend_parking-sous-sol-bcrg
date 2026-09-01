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
    doit_changer_mdp: utilisateur.doit_changer_mdp,
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

export const getMe = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Utilisateur non authentifié.', 401);
  }

  const utilisateur = await db.orm.public.Utilisateur
    .where({ id: userId })
    .include('agent', (a) => a)
    .first();

  if (!utilisateur) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  // On exclut le mot de passe avant de renvoyer
  const { mot_de_passe, ...userInfo } = utilisateur;

  res.json({
    utilisateur: userInfo
  });
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { nouveau_mot_de_passe } = req.body;
  if (!nouveau_mot_de_passe) {
    throw new AppError('Le nouveau mot de passe est obligatoire.', 400);
  }

  // @ts-ignore
  const id_utilisateur = req.user.id;

  const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe + PEPPER, 10);

  await db.orm.public.Utilisateur.where({ id: id_utilisateur }).update({
    mot_de_passe: hashedPassword,
    doit_changer_mdp: false
  });

  res.json({ message: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter avec votre nouveau mot de passe.' });
};
