import bcrypt from 'bcrypt';
import { db } from './prisma/db';
import dotenv from 'dotenv';

dotenv.config();

const PEPPER = process.env.PASSWORD_PEPPER || 'default_pepper';

async function seed() {
  try {
    console.log('Seeding test users...');
    const rawPassword = 'password123';
    const pepperedPassword = rawPassword + PEPPER;
    
    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pepperedPassword, saltRounds);

    const vigiles = [
      { nom: 'Bangoura', prenom: 'Rachid', matricule: 'VIGILE001' },
      { nom: 'Barry', prenom: 'Bano', matricule: 'VIGILE002' },
      { nom: 'Keita', prenom: 'Moriba', matricule: 'VIGILE003' }
    ];

    for (const vigile of vigiles) {
      // Create user
      const utilisateur = await db.orm.public.Utilisateur.create({
        nom: vigile.nom,
        prenom: vigile.prenom,
        matricule: vigile.matricule,
        mot_de_passe: hashedPassword,
        role: ['agent'],
        est_actif: true
      });

      console.log('Utilisateur créé:', utilisateur);

      // Create associated agent
      const agent = await db.orm.public.Agent.create({
        id_utilisateur: utilisateur.id
      });

      console.log('Agent créé:', agent);
    }

    console.log('✅ Seed terminé avec succès.');
    console.log(`\nVous pouvez tester avec les identifiants suivants (Mot de passe commun : ${rawPassword}) :`);
    vigiles.forEach(v => {
      console.log(`- ${v.prenom} ${v.nom} | Matricule: ${v.matricule}`);
    });
  } catch (error) {
    console.error('Erreur lors du seed:', error);
  } finally {
    await db.close(); // Important for script to exit properly
  }
}

seed();
