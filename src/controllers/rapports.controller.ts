import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

/**
 * Route pour exporter les rapports (Historique) en format CSV ou PDF
 */
export const exporterRapports = async (req: Request, res: Response): Promise<void> => {
  const format = req.query.format as string;
  
  if (format !== 'csv' && format !== 'pdf') {
    throw new AppError('Format invalide. Utilisez format=csv ou format=pdf.', 400);
  }

  // Filtrage similaire à getHistorique
  const filters: any = {};
  if (req.query.dateDebut) {
    filters.heure_arrivee = { ...filters.heure_arrivee, gte: new Date(req.query.dateDebut as string) };
  }
  if (req.query.dateFin) {
    filters.heure_arrivee = { ...filters.heure_arrivee, lte: new Date(req.query.dateFin as string) };
  }
  if (req.query.typeEntree) {
    filters.type_entree = req.query.typeEntree as string;
  }

  // Si aucun filtre de date, on met une limite pour ne pas crasher le serveur (ex: 1000 derniers)
  let limit = 10000;
  
  const query = db.orm.public.Mouvement
    .where(filters)
    .include('vehicule', v => v.include('personnel', p => p.include('utilisateur', u => u)))
    .include('agent', a => a.include('utilisateur', u => u))
    .include('personnel_visite', p => p.include('utilisateur', u => u))
    .orderBy(m => m.heure_arrivee.desc())
    .limit(limit);

  const mouvements = await query.all();

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_historique.csv');

    // Headers CSV
    res.write('Date/Heure Arrivee,Matricule/Nom,Type,Vehicule,Agent Validation,Observation\n');
    
    // Rows
    for (const m of mouvements) {
      const dateArr = m.heure_arrivee ? new Date(m.heure_arrivee).toLocaleString('fr-FR') : 'N/A';
      const nom = m.vehicule?.personnel?.utilisateur?.matricule || m.personnel_visite?.utilisateur?.matricule || 'Visiteur/Inconnu';
      const type = m.type_entree || 'N/A';
      const vehicule = m.vehicule?.numero_plaque || 'Aucun';
      const agent = m.agent?.utilisateur?.matricule || 'Inconnu';
      const obs = (m.observation || '').replace(/,/g, ' '); // simple escape for CSV
      
      res.write(`${dateArr},${nom},${type},${vehicule},${agent},${obs}\n`);
    }
    
    res.end();
    return;
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rapport_historique.pdf');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    // Tentative d'insertion du logo (doit être placé dans src/assets/logo-bcrg.jpeg)
    const logoPath = path.join(__dirname, '..', 'assets', 'logo-bcrg.jpeg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 30, 30, { width: 100 });
    }

    doc.fontSize(20).text('Rapport Historique des Passages', 150, 40);
    doc.fontSize(10).text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 150, 65);
    
    doc.moveDown(3);

    // Simple Header pour le tableau
    let y = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 30, y, { width: 100 });
    doc.text('Nom/Matricule', 130, y, { width: 120 });
    doc.text('Type', 250, y, { width: 80 });
    doc.text('Plaque', 330, y, { width: 80 });
    doc.text('Agent', 410, y, { width: 100 });
    
    doc.moveTo(30, y + 15).lineTo(550, y + 15).stroke();
    
    doc.font('Helvetica');
    y += 20;

    for (const m of mouvements) {
      if (y > 750) {
        doc.addPage();
        y = 30;
      }
      
      const dateArr = m.heure_arrivee ? new Date(m.heure_arrivee).toLocaleString('fr-FR') : 'N/A';
      const nom = m.vehicule?.personnel?.utilisateur?.matricule || m.personnel_visite?.utilisateur?.matricule || 'Visiteur';
      const type = m.type_entree || 'N/A';
      const vehicule = m.vehicule?.numero_plaque || 'Aucun';
      const agent = m.agent?.utilisateur?.matricule || '-';

      doc.text(String(dateArr), 30, y, { width: 100 });
      doc.text(String(nom), 130, y, { width: 120 });
      doc.text(String(type), 250, y, { width: 80 });
      doc.text(String(vehicule), 330, y, { width: 80 });
      doc.text(String(agent), 410, y, { width: 100 });

      y += 15;
    }

    doc.end();
  }
};
