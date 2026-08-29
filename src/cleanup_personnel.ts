import { db } from './prisma/db';

async function cleanup() {
  try {
    console.log('Nettoyage des rôles et mots de passe pour le personnel...');

    // Find all users who are in the Personnel table
    const personnels = await db.orm.public.Personnel.all();
    
    let count = 0;
    for (const p of personnels) {
      if (p.id_utilisateur) {
        await db.orm.public.Utilisateur.where({ id: p.id_utilisateur }).update({
          mot_de_passe: null,
          role: [] as any
        });
        count++;
      }
    }

    console.log(`✅ Nettoyage terminé avec succès. ${count} comptes personnel mis à jour.`);
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  } finally {
    await db.close(); 
  }
}

cleanup();
