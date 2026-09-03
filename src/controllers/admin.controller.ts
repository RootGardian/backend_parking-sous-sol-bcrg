import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import bcrypt from 'bcrypt';
import csv from 'csv-parser';
import fs from 'fs';
import QRCode from 'qrcode';
import { AppError } from '../utils/AppError';
import { Temporal } from '@js-temporal/polyfill';

const PEPPER = process.env.PASSWORD_PEPPER ?? 'default_pepper';

const SALT_ROUNDS = 10;

/**
 * Helper pour lire un CSV sous forme de Promise
 */
const parseCSV = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

/**
 * Exporte la liste du personnel avec leurs informations et QR Codes
 */
export const exportQRCodes = async (req: Request, res: Response): Promise<void> => {
  const personnels = await db.orm.public.Personnel
    .include('utilisateur', (u) => u)
    .include('fonction', (f) => f)
    .all();

  const data = personnels.map((p) => ({
    nom: p.utilisateur?.nom,
    prenom: p.utilisateur?.prenom,
    matricule: p.utilisateur?.matricule,
    fonction: p.fonction?.nom,
    qr_code: p.qr_code
  }));

  res.json(data);
};

/**
 * Import massif des utilisateurs (Agents/Supervisions) depuis un fichier CSV
 * Colonnes attendues: nom, prenom, matricule, mot_de_passe, role
 */
export const importUtilisateurs = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError('Aucun fichier CSV fourni.', 400);
  }

  try {
    const results = await parseCSV(req.file.path);

    await db.transaction(async (tx) => {
      for (const row of results) {
        const { nom, prenom, matricule, role } = row;

        if (!matricule || !role) {
          throw new AppError(`Données manquantes (matricule ou role) pour la ligne: ${JSON.stringify(row)}`, 400);
        }

        const existant = await tx.orm.public.Utilisateur.where({ matricule }).first();
        if (existant) {
          continue; // On ignore les doublons
        }

        const hashedPassword = await bcrypt.hash('BCrgP@rking@2026' + PEPPER, SALT_ROUNDS);

        const utilisateur = await tx.orm.public.Utilisateur.create({
          nom: nom || null,
          prenom: prenom || null,
          matricule,
          mot_de_passe: hashedPassword,
      doit_changer_mdp: true,
          role: [role],
          est_actif: true
        });

        const lowerRole = role.toLowerCase();
        if (['agent', 'supervision', 'vigile', 'admin', 'administrateur'].includes(lowerRole)) {
          await tx.orm.public.Agent.create({
            id_utilisateur: utilisateur.id
          });
        }
      }

      const id_utilisateur_admin = (req as any).user.id;
      await tx.orm.public.AuditLog.create({
        id_utilisateur: id_utilisateur_admin,
        action: 'IMPORT_UTILISATEURS',
        cible: `Fichier CSV`,
        details: `${results.length} utilisateurs importés`,
        date_action: Temporal.Now.instant()
      });
    });

    fs.unlinkSync(req.file.path);
    res.json({ message: `${results.length} utilisateurs importés avec succès.` });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw error;
  }
};

/**
 * Import massif du personnel et de leurs véhicules depuis un CSV
 * Colonnes attendues: nom, prenom, matricule, fonction, numero_plaque
 */
export const importPersonnel = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError('Aucun fichier CSV fourni.', 400);
  }

  try {
    const results = await parseCSV(req.file.path);

    await db.transaction(async (tx) => {
      for (const row of results) {
        const { nom, prenom, matricule, fonction, numero_plaque, marque, couleur } = row;

        if (!matricule || !fonction) {
          throw new AppError(`Données manquantes (matricule ou fonction) pour la ligne: ${JSON.stringify(row)}`, 400);
        }

        const existant = await tx.orm.public.Utilisateur.where({ matricule }).first();
        if (existant) {
          continue; // On ignore les doublons
        }

        // Mot de passe par défaut = BCrgP@rking@2026, l'utilisateur devra le changer à la première connexion
        const hashedPassword = await bcrypt.hash('BCrgP@rking@2026' + PEPPER, SALT_ROUNDS);

        const utilisateur = await tx.orm.public.Utilisateur.create({
          nom: nom || null,
          prenom: prenom || null,
          matricule,
          mot_de_passe: hashedPassword,
          est_actif: true,
          doit_changer_mdp: true,
          role: ['personnel']
        });

        // Le QR Code n'encode que le matricule pour être très rapide à scanner
        const qrCodeBase64 = await QRCode.toDataURL(matricule);

        // Rechercher l'ID de la fonction par son nom
        let fonctionRecord = await tx.orm.public.Fonction.where({ nom: fonction }).first();
        if (!fonctionRecord) {
          fonctionRecord = await tx.orm.public.Fonction.create({ nom: fonction });
        }

        const personnel = await tx.orm.public.Personnel.create({
          id_utilisateur: utilisateur.id,
          id_fonction: fonctionRecord.id,
          qr_code: qrCodeBase64
        });

        if (numero_plaque) {
          await tx.orm.public.Vehicule.create({
            numero_plaque,
            marque: marque || null,
            couleur: couleur || null,
            type: 'personnel',
            id_personnel: personnel.id
          });
        }
      }

      const id_utilisateur_admin = (req as any).user.id;
      await tx.orm.public.AuditLog.create({
        id_utilisateur: id_utilisateur_admin,
        action: 'IMPORT_PERSONNEL',
        cible: `Fichier CSV`,
        details: `${results.length} personnels importés`,
        date_action: Temporal.Now.instant()
      });
    });

    fs.unlinkSync(req.file.path);
    res.json({ message: `${results.length} personnels importés avec succès.` });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    throw error;
  }
};

/**
 * Ajouter manuellement un membre du personnel
 */
export const ajouterPersonnel = async (req: Request, res: Response): Promise<void> => {
  const { nom, prenom, matricule, id_fonction, fonction, numero_plaque } = req.body;

  if (!matricule || (!id_fonction && !fonction)) {
    throw new AppError('Les champs matricule et fonction sont obligatoires.', 400);
  }

  let fonctionRecord;
  if (id_fonction) {
    fonctionRecord = await db.orm.public.Fonction.where({ id: Number(id_fonction) }).first();
  } else if (fonction) {
    fonctionRecord = await db.orm.public.Fonction.where({ nom: fonction }).first();
    // Créer la fonction si elle n'existe pas (optionnel mais robuste)
    if (!fonctionRecord) {
      fonctionRecord = await db.orm.public.Fonction.create({ nom: fonction });
    }
  }

  if (!fonctionRecord) {
    throw new AppError('Fonction introuvable.', 404);
  }

  // Vérifier que le matricule n'existe pas déjà
  const existant = await db.orm.public.Utilisateur.where({ matricule }).first();
  if (existant) {
    throw new AppError('Ce matricule existe déjà.', 409);
  }

  await db.transaction(async (tx) => {
    // Mot de passe par défaut = BCrgP@rking@2026, l'utilisateur devra le changer à la première connexion
    const hashedPassword = await bcrypt.hash('BCrgP@rking@2026' + PEPPER, SALT_ROUNDS);

    const utilisateur = await tx.orm.public.Utilisateur.create({
      nom: nom || null,
      prenom: prenom || null,
      matricule,
      mot_de_passe: hashedPassword,
      est_actif: true,
      doit_changer_mdp: true,
      role: ['personnel']
    });

    const qrCodeBase64 = await QRCode.toDataURL(matricule);

    const personnel = await tx.orm.public.Personnel.create({
      id_utilisateur: utilisateur.id,
      id_fonction: fonctionRecord.id,
      qr_code: qrCodeBase64
    });

    if (numero_plaque) {
      await tx.orm.public.Vehicule.create({
        numero_plaque,
        id_personnel: personnel.id
      });
    }

    const id_utilisateur_admin = (req as any).user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur: id_utilisateur_admin,
      action: 'AJOUT_PERSONNEL',
      cible: `Matricule ${matricule}`,
      details: `Nom: ${nom}, Prénom: ${prenom}, Fonction ID: ${id_fonction}`,
      date_action: Temporal.Now.instant()
    });
  });

  res.status(201).json({ message: 'Personnel ajouté avec succès.' });
};

/**
 * Modifier un membre du personnel
 */
export const modifierPersonnel = async (req: Request, res: Response): Promise<void> => {
  const matriculeActuel = String(req.params.matricule);
  const { nom, prenom, matricule, id_fonction } = req.body;

  const utilisateur = await db.orm.public.Utilisateur
    .where({ matricule: matriculeActuel })
    .include('personnel', p => p)
    .first();

  if (!utilisateur || !utilisateur.personnel) {
    throw new AppError('Personnel introuvable.', 404);
  }

  await db.transaction(async (tx) => {
    // Si le matricule change, vérifier qu'il n'est pas déjà pris
    if (matricule && typeof matricule === 'string' && matricule !== matriculeActuel) {
      const existant = await tx.orm.public.Utilisateur.where({ matricule }).first();
      if (existant) {
        throw new AppError('Le nouveau matricule est déjà utilisé.', 409);
      }
    }

    const updatedMatricule = (matricule && typeof matricule === 'string') ? matricule : matriculeActuel;

    // Mise à jour Utilisateur
    await tx.orm.public.Utilisateur.where({ id: utilisateur.id }).update({
      nom: nom !== undefined ? nom : utilisateur.nom,
      prenom: prenom !== undefined ? prenom : utilisateur.prenom,
      matricule: updatedMatricule
    });

    // Récupérer le personnel avec les types corrects
    const personnelToUpdate = await tx.orm.public.Personnel.where({ id_utilisateur: utilisateur.id }).first();

    if (personnelToUpdate) {
      const updatedFonction = id_fonction ? Number(id_fonction) : personnelToUpdate.id_fonction;
      let qr_code = personnelToUpdate.qr_code;

      // Regénérer QR Code si le matricule change
      if (matricule && typeof matricule === 'string' && matricule !== matriculeActuel) {
        qr_code = await QRCode.toDataURL(updatedMatricule);
      }

      // Mise à jour Personnel
      await tx.orm.public.Personnel.where({ id: personnelToUpdate.id }).update({
        id_fonction: updatedFonction,
        qr_code
      });
    }

    const id_utilisateur_admin = (req as any).user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur: id_utilisateur_admin,
      action: 'MODIFICATION_PERSONNEL',
      cible: `Matricule ${updatedMatricule}`,
      details: `Nom: ${nom}, Fonction: ${id_fonction}`,
      date_action: Temporal.Now.instant()
    });
  });

  res.json({ message: 'Personnel modifié avec succès.' });
};

/**
 * Supprimer un membre du personnel (Soft Delete)
 */
export const supprimerPersonnel = async (req: Request, res: Response): Promise<void> => {
  const matricule = String(req.params.matricule);

  const utilisateur = await db.orm.public.Utilisateur.where({ matricule }).first();

  if (!utilisateur) {
    throw new AppError('Personnel introuvable.', 404);
  }

  await db.orm.public.Utilisateur.where({ id: utilisateur.id }).update({
    est_actif: false
  });

  const id_utilisateur_admin = (req as any).user.id;
  await db.orm.public.AuditLog.create({
    id_utilisateur: id_utilisateur_admin,
    action: 'SUPPRESSION_PERSONNEL',
    cible: `Matricule ${matricule}`,
    details: 'Soft delete (Désactivation)',
    date_action: Temporal.Now.instant()
  });

  res.json({ message: 'Personnel désactivé avec succès.' });
};

/**
 * Ajouter manuellement un utilisateur système (Agent, Supervision, Admin)
 */
export const ajouterUtilisateur = async (req: Request, res: Response): Promise<void> => {
  const { nom, prenom, matricule, role } = req.body;

  if (!matricule || !role) {
    throw new AppError('Les champs matricule et role sont obligatoires.', 400);
  }

  const existant = await db.orm.public.Utilisateur.where({ matricule }).first();
  if (existant) {
    throw new AppError('Ce matricule existe déjà.', 409);
  }

  const hashedPassword = await bcrypt.hash('BCrgP@rking@2026' + PEPPER, SALT_ROUNDS);

  const dbRole = role === 'Administrateur' ? 'admin' : role.toLowerCase();

  await db.transaction(async (tx) => {
    const utilisateur = await tx.orm.public.Utilisateur.create({
      nom: nom || null,
      prenom: prenom || null,
      matricule,
      mot_de_passe: hashedPassword,
      doit_changer_mdp: true,
      role: [dbRole],
      est_actif: true
    });

    const lowerRole = role.toLowerCase();
    if (['agent', 'supervision', 'vigile', 'admin', 'administrateur'].includes(lowerRole)) {
      await tx.orm.public.Agent.create({
        id_utilisateur: utilisateur.id
      });
    }

    const id_utilisateur_admin = (req as any).user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur: id_utilisateur_admin,
      action: 'AJOUT_UTILISATEUR',
      cible: `Matricule ${matricule}`,
      details: `Rôle: ${role}`,
      date_action: Temporal.Now.instant()
    });
  });

  res.status(201).json({ message: 'Utilisateur ajouté avec succès.' });
};

/**
 * Modifier un utilisateur système
 */
export const modifierUtilisateur = async (req: Request, res: Response): Promise<void> => {
  const matriculeActuel = String(req.params.matricule);
  const { nom, prenom, matricule, role, mot_de_passe } = req.body;

  const utilisateur = await db.orm.public.Utilisateur.where({ matricule: matriculeActuel }).first();

  if (!utilisateur) {
    throw new AppError('Utilisateur introuvable.', 404);
  }

  await db.transaction(async (tx) => {
    if (matricule && typeof matricule === 'string' && matricule !== matriculeActuel) {
      const existant = await tx.orm.public.Utilisateur.where({ matricule }).first();
      if (existant) {
        throw new AppError('Le nouveau matricule est déjà utilisé.', 409);
      }
    }

    const updatedMatricule = (matricule && typeof matricule === 'string') ? matricule : matriculeActuel;

    let hashedPassword = utilisateur.mot_de_passe;
    if (mot_de_passe) {
      hashedPassword = await bcrypt.hash(mot_de_passe + PEPPER, SALT_ROUNDS);
    }


    const updatedRole = role ? [role === 'Administrateur' ? 'admin' : role.toLowerCase()] : utilisateur.role;

    await tx.orm.public.Utilisateur.where({ id: utilisateur.id }).update({
      nom: nom !== undefined ? nom : utilisateur.nom,
      prenom: prenom !== undefined ? prenom : utilisateur.prenom,
      matricule: updatedMatricule,
      mot_de_passe: hashedPassword,
      ...(mot_de_passe ? { doit_changer_mdp: true } : {}),
      role: updatedRole as any
    });

    // Créer l'entrée Agent si le rôle change vers agent/supervision et n'existe pas
    if (role) {
      const lowerRole = role.toLowerCase();
      if (['agent', 'supervision', 'vigile', 'admin', 'administrateur'].includes(lowerRole)) {
        const existingAgent = await tx.orm.public.Agent.where({ id_utilisateur: utilisateur.id }).first();
        if (!existingAgent) {
          await tx.orm.public.Agent.create({ id_utilisateur: utilisateur.id });
        }
      }
    }

    const id_utilisateur_admin = (req as any).user.id;
    await tx.orm.public.AuditLog.create({
      id_utilisateur: id_utilisateur_admin,
      action: 'MODIFICATION_UTILISATEUR',
      cible: `Matricule ${updatedMatricule}`,
      details: `Rôle: ${role || utilisateur.role}`,
      date_action: Temporal.Now.instant()
    });
  });

  res.json({ message: 'Utilisateur modifié avec succès.' });
};

/**
 * Récupère les statistiques RBAC pour le dashboard (comptes par rôle)
 */
export const getUtilisateursStats = async (req: Request, res: Response): Promise<void> => {
  const allUsers = await db.orm.public.Utilisateur.where({ est_actif: true }).all();

  const total = allUsers.length;
  const adminCount = allUsers.filter(u => (u.role as string[])?.includes('admin')).length;
  const supervisionCount = allUsers.filter(u => (u.role as string[])?.includes('supervision')).length;
  const agentCount = allUsers.filter(u => (u.role as string[])?.includes('agent')).length;

  res.json({
    total,
    admins: adminCount,
    supervision: supervisionCount,
    agents: agentCount
  });
};

/**
 * Récupère la liste de tous les utilisateurs (comptes) avec leurs rôles
 */
export const getUtilisateurs = async (req: Request, res: Response): Promise<void> => {
  const users = await db.orm.public.Utilisateur
    .include('personnel', (p) => p
      .include('fonction', (f) => f)
      .include('vehicules', (v) => v)
    )
    .include('agent', (a) => a)
    .orderBy((u) => u.id.desc())
    .all();

  // Filtrer pour ne garder que les rôles système
  const systemUsers = users.filter((u) => {
    const roles = (u.role as string[]) || [];
    return roles.some(r => ['agent', 'supervision', 'admin'].includes(r));
  });

  // Supprimer le mot de passe avant de renvoyer
  const cleanUsers = systemUsers.map(u => {
    const { mot_de_passe, ...rest } = u as any;
    return rest;
  });

  res.json(cleanUsers);
};
