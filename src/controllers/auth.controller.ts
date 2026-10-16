import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';
import crypto from 'crypto';
import { ssoService } from '../services/sso.service';
import {
  normalizeMatricule,
  getMatriculeVariants,
  matchPersonNames,
  matchEmailWithPerson,
} from '../utils/matricule.util';

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

  // Vérification de l'état actif
  if (utilisateur.est_actif === false) {
    throw new AppError('Ce compte utilisateur a été désactivé. Veuillez contacter un administrateur.', 403);
  }

  // Vérification du mot de passe avec le pepper
  const pepperedPassword = mot_de_passe + PEPPER;
  const isPasswordValid = await bcrypt.compare(pepperedPassword, utilisateur.mot_de_passe ?? '');

  if (!isPasswordValid) {
    throw new AppError('Identifiants invalides.', 401);
  }

  // Récupération de l'agent si l'utilisateur en est un
  const agent = await db.orm.public.Agent.where({ id_utilisateur: utilisateur.id }).first();
  const personnel = await db.orm.public.Personnel.where({ id_utilisateur: utilisateur.id }).first();

  // Création du token et du session_id
  const session_id = crypto.randomUUID();

  await db.orm.public.Utilisateur.where({ id: utilisateur.id }).update({ session_id });

  const tokenData = {
    id: utilisateur.id,
    matricule: utilisateur.matricule,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    role: utilisateur.role,
    doit_changer_mdp: utilisateur.doit_changer_mdp,
    id_agent: agent?.id ?? null,
    id_personnel: personnel?.id ?? null,
    session_id,
  };

  const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  res.status(200).json({
    message: 'Connexion réussie',
    token,
    doit_changer_mdp: utilisateur.doit_changer_mdp ?? true,
    utilisateur: {
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role,
      doit_changer_mdp: utilisateur.doit_changer_mdp ?? true
    }
  });
};

/**
 * Connexion via Single Sign-On (SSO) BCRG HUB / Active Directory.
 * Valide le jeton JWT transmis par le HUB (RS256/JWKS/PEM ou HS256),
 * provisionne automatiquement l'utilisateur si inexistant,
 * et gère les rôles propres à l'application Parking BCRG.
 */
export const ssoLogin = async (req: Request, res: Response): Promise<void> => {
  let ssoToken = req.body?.sso_token || req.body?.token;
  if (!ssoToken && req.headers.authorization?.startsWith('Bearer ')) {
    ssoToken = req.headers.authorization.split(' ')[1];
  }

  if (!ssoToken) {
    throw new AppError('Jeton d\'authentification SSO (sso_token) requis.', 400);
  }

  // 1. Validation cryptographique du jeton du BCRG HUB
  const hubPayload = await ssoService.verifyHubToken(ssoToken);

  // L'Active Directory transmet l'identifiant (sAMAccountName), l'email (identifiant@bcrg-guinee.org) et les Nom/Prénom
  const emailPrefix = hubPayload.email ? (hubPayload.email.split('@')[0] ?? '') : '';
  const adIdentifier = (hubPayload.matricule || emailPrefix).trim();
  const adEmail = hubPayload.email?.trim() || '';
  const adLastName = (hubPayload.last_name || hubPayload.nom || '').trim();
  const adFirstName = (hubPayload.first_name || hubPayload.prenom || '').trim();

  let utilisateur: any = null;

  // 2. Recherche résiliente pour matcher avec le profil importé via CSV :
  // Stratégie A : Recherche par Nom et Prénom (insensible aux accents, casse et ordre, ex: "Kaba Karamo" <-> "Karamo Kaba")
  if (adLastName || adFirstName) {
    const allUsers = await db.orm.public.Utilisateur.all();
    utilisateur = allUsers.find(u => matchPersonNames(adLastName, adFirstName, u.nom, u.prenom)) || null;

    // Stratégie B : Si non trouvé, matcher par email ou identifiant AD (ex: karamo.kaba@bcrg-guinee.org <-> Kaba Karamo)
    if (!utilisateur && (adEmail || adIdentifier)) {
      utilisateur = allUsers.find(u =>
        matchEmailWithPerson(adEmail, u.nom, u.prenom) ||
        matchEmailWithPerson(adIdentifier, u.nom, u.prenom)
      ) || null;
    }
  }

  // Stratégie C : Si non trouvé, tester les variantes du matricule/identifiant
  if (!utilisateur && adIdentifier) {
    const variants = getMatriculeVariants(adIdentifier);
    for (const v of variants) {
      utilisateur = await db.orm.public.Utilisateur.where({ matricule: v }).first();
      if (utilisateur) break;
    }
  }

  if (!utilisateur) {
    // Nouvel utilisateur venant du HUB non pré-importé dans le CSV
    const fallbackMatricule: string = adIdentifier || emailPrefix || ('AD-' + String(hubPayload.sub || crypto.randomUUID().slice(0, 8)));

    utilisateur = await db.orm.public.Utilisateur.create({
      matricule: fallbackMatricule || null,
      nom: adLastName || null,
      prenom: adFirstName || null,
      role: ['personnel'],
      est_actif: true,
      doit_changer_mdp: false, // Mot de passe géré en amont par Active Directory / HUB
    });
  } else {
    // Compte existant (créé lors de l'import CSV ou d'une session antérieure)
    if (utilisateur.est_actif === false) {
      throw new AppError('Votre compte Parking BCRG est actuellement désactivé. Veuillez contacter un administrateur.', 403);
    }

    // On préserve le matricule RH officiel importé depuis le CSV (ex: "BCRG-001"),
    // et on complète simplement les champs nom/prénom si manquants
    const updates: any = {
      doit_changer_mdp: false,
    };

    if (!utilisateur.nom && adLastName) {
      updates.nom = adLastName;
    }
    if (!utilisateur.prenom && adFirstName) {
      updates.prenom = adFirstName;
    }

    if (Object.keys(updates).length > 0) {
      await db.orm.public.Utilisateur.where({ id: utilisateur.id }).update(updates);
      utilisateur = { ...utilisateur, ...updates };
    }
  }

  if (!utilisateur) {
    throw new AppError('Erreur lors du traitement du profil utilisateur.', 500);
  }

  // 3. Récupération des associations Parking (Agent ou Personnel)
  const agent = await db.orm.public.Agent.where({ id_utilisateur: utilisateur.id }).first();
  const personnel = await db.orm.public.Personnel.where({ id_utilisateur: utilisateur.id }).first();

  // 4. Génération de la session locale Parking
  const session_id = crypto.randomUUID();
  await db.orm.public.Utilisateur.where({ id: utilisateur.id }).update({ session_id });

  const tokenData = {
    id: utilisateur.id,
    matricule: utilisateur.matricule,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    role: utilisateur.role,
    doit_changer_mdp: false,
    id_agent: agent?.id ?? null,
    id_personnel: personnel?.id ?? null,
    session_id,
    auth_provider: 'BCRG_HUB_SSO',
  };

  const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  res.status(200).json({
    message: 'Authentification SSO BCRG Hub réussie',
    token,
    access_token: token,
    doit_changer_mdp: false,
    utilisateur: {
      id: utilisateur.id,
      matricule: utilisateur.matricule,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role,
      doit_changer_mdp: false,
      id_parking: agent?.id_parking ?? null,
    }
  });
};

/**
 * Récepteur du signal Single Logout (SLO) émis par le BCRG HUB.
 * Révoque la session locale active de l'utilisateur concerné.
 */
export const singleLogout = async (req: Request, res: Response): Promise<void> => {
  const { matricule, logout_token } = req.body || {};

  let targetMatricule = matricule;

  if (logout_token) {
    try {
      const decoded = await ssoService.verifyHubToken(logout_token);
      targetMatricule = decoded.matricule || targetMatricule;
    } catch (err: any) {
      console.warn('[SLO] Avertissement décodage logout_token:', err.message);
    }
  }

  if (targetMatricule) {
    const user = await db.orm.public.Utilisateur.where({ matricule: targetMatricule }).first();
    if (user) {
      await db.orm.public.Utilisateur.where({ id: user.id }).update({ session_id: null });
      console.log(`[SLO] Session Parking révoquée pour l'agent ${targetMatricule}`);
    }
  }

  res.status(200).json({ status: 'SUCCESS', message: 'Signal SLO traité avec succès.' });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Utilisateur non authentifié.', 401);
  }

  const utilisateur = await db.orm.public.Utilisateur
    .where({ id: userId })
    .include('agent', (a) => a.include('parking', (p) => p))
    .include('personnel', (p) => p.include('fonction', (f) => f).include('vehicules', (v) => v))
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
