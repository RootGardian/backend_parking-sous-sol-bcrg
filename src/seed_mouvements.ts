import { Temporal } from '@js-temporal/polyfill';
(globalThis as any).Temporal = Temporal;

import { db } from './prisma/db';
import bcrypt from 'bcrypt';

async function setup() {
  try {
    console.log('Mise à jour des noms (Agent, Superviseur, Admin)...');
    
    // We will find or create them based on their roles
    const users = await db.orm.public.Utilisateur.all();
    
    // aissatou camara -> admin
    // demba touré -> superviseur
    // aly badara sano -> agent
    
    // Let's create or update them
    const rolesToUpdate = [
      { role: 'admin', nom: 'Camara', prenom: 'Aissatou', matricule: 'ADMIN01', pass: 'admin123' },
      { role: 'superviseur', nom: 'Touré', prenom: 'Demba', matricule: 'SUP01', pass: 'sup123' },
      { role: 'agent', nom: 'Sano', prenom: 'Aly Badara', matricule: 'AGENT01', pass: 'agent123' }
    ];
    
    for (const r of rolesToUpdate) {
        // find existing by role
        let user = users.find(u => u.role && (u.role as string[]).includes(r.role));
        if (user) {
            await db.orm.public.Utilisateur.where({ id: user.id }).update({
                nom: r.nom,
                prenom: r.prenom
            });
            console.log(`Mis à jour: ${r.prenom} ${r.nom} (${r.role})`);
        } else {
            const hashed = await bcrypt.hash(r.pass, 10);
            const newUser = await db.orm.public.Utilisateur.create({
                nom: r.nom,
                prenom: r.prenom,
                matricule: r.matricule,
                mot_de_passe: hashed,
                role: [r.role] as any,
                est_actif: true
            });
            if (r.role === 'agent' || r.role === 'superviseur') {
                await db.orm.public.Agent.create({ id_utilisateur: newUser.id });
            }
            console.log(`Créé: ${r.prenom} ${r.nom} (${r.role})`);
        }
    }

    console.log('Seeding mouvements...');
    const vehicules = await db.orm.public.Vehicule.all();
    const agents = await db.orm.public.Agent.all();

    if (vehicules.length === 0) {
        console.log("Erreur: Aucun véhicule.");
        return;
    }

    if (agents.length === 0) {
         console.log("Erreur: Aucun agent.");
         return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mouvementsData = [];

    for (let i = 0; i < Math.min(vehicules.length, 5); i++) {
        const vehicule = vehicules[i];
        const agent = agents[0];

        const heureArriveeSurSite = new Date(today);
        heureArriveeSurSite.setHours(8 + i, Math.floor(Math.random() * 60), 0, 0);

        mouvementsData.push({
            id_vehicule: vehicule.id,
            heure_arrivee: Temporal.Instant.fromEpochMilliseconds(heureArriveeSurSite.getTime()),
            id_agent: agent.id,
            statut: 'sur_site' as any,
            type_entree: vehicule.type || 'personnel' as any,
            observation: 'Entrée matinale'
        });

        const heureArriveeHorsSite = new Date(today);
        heureArriveeHorsSite.setHours(7, Math.floor(Math.random() * 60), 0, 0);
        
        const heureDepartHorsSite = new Date(today);
        heureDepartHorsSite.setHours(12 + i, Math.floor(Math.random() * 60), 0, 0);

        const vehiculeHorsSite = vehicules[(i + 2) % vehicules.length];

        mouvementsData.push({
            id_vehicule: vehiculeHorsSite.id,
            heure_arrivee: Temporal.Instant.fromEpochMilliseconds(heureArriveeHorsSite.getTime()),
            heure_depart: Temporal.Instant.fromEpochMilliseconds(heureDepartHorsSite.getTime()),
            id_agent: agent.id,
            statut: 'hors_site' as any,
            type_entree: vehiculeHorsSite.type || 'personnel' as any,
            observation: 'Visite terminée'
        });
    }

    let count = 0;
    for(const mData of mouvementsData) {
       await db.orm.public.Mouvement.create(mData);
       count++;
    }

    console.log(`✅ ${count} mouvements insérés avec succès.`);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await db.close();
  }
}

setup();
