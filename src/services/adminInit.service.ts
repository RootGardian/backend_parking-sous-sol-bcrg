import bcrypt from 'bcrypt';
import { db } from '../prisma/db';

const SALT_ROUNDS = 10;

/**
 * Initialise l'administrateur par défaut au démarrage du serveur si celui-ci n'existe pas.
 * Les informations sont récupérées depuis les variables d'environnement (.env).
 */
export const initDefaultAdmin = async (): Promise<void> => {
  try {
    const matricule =
      process.env.ADMIN_MATRICULE ||
      process.env.DEFAULT_ADMIN_MATRICULE ||
      'ADMIN-001';

    const rawPassword =
      process.env.ADMIN_PASSWORD ||
      process.env.DEFAULT_ADMIN_PASSWORD ||
      process.env.ADMIN_MOT_DE_PASSE ||
      process.env.DEFAULT_ADMIN_MOT_DE_PASSE ||
      'Admin@2026!';

    const nom =
      process.env.ADMIN_NOM ||
      process.env.DEFAULT_ADMIN_NOM ||
      'Admin';

    const prenom =
      process.env.ADMIN_PRENOM ||
      process.env.DEFAULT_ADMIN_PRENOM ||
      'Principal';

    const doitChangerMdp =
      process.env.ADMIN_DOIT_CHANGER_MDP === 'true' ||
      process.env.DEFAULT_ADMIN_DOIT_CHANGER_MDP === 'true';

    const pepper = process.env.PASSWORD_PEPPER ?? 'default_pepper';

    // Vérifier si un utilisateur avec ce matricule existe déjà
    const existant = await db.orm.public.Utilisateur.where({ matricule }).first();

    if (existant) {
      console.log(`[InitAdmin] L'administrateur par défaut (${matricule}) existe déjà.`);
      return;
    }

    // Hachage du mot de passe avec le pepper
    const hashedPassword = await bcrypt.hash(rawPassword + pepper, SALT_ROUNDS);

    // Création de l'utilisateur admin et de son entrée agent associée
    await db.transaction(async (tx) => {
      const utilisateur = await tx.orm.public.Utilisateur.create({
        nom,
        prenom,
        matricule,
        mot_de_passe: hashedPassword,
        doit_changer_mdp: doitChangerMdp,
        role: ['admin'],
        est_actif: true,
      });

      // Création de l'enregistrement Agent pour permettre la liaison
      const agentExistant = await tx.orm.public.Agent.where({ id_utilisateur: utilisateur.id }).first();
      if (!agentExistant) {
        await tx.orm.public.Agent.create({
          id_utilisateur: utilisateur.id,
          id_parking: null,
        });
      }
    });

    console.log(`[InitAdmin] ✅ Administrateur par défaut créé avec succès (Matricule: ${matricule}).`);
  } catch (error) {
    console.error(`[InitAdmin] ❌ Erreur lors de la création de l'administrateur par défaut:`, error);
  }
};
