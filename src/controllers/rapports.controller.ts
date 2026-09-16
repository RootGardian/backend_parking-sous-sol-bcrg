import { Temporal } from '@js-temporal/polyfill';
import type { Request, Response } from 'express';
import { db } from '../prisma/db';
import { AppError } from '../utils/AppError';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { applyPdfHeaderFooter, registerVerdanaFont } from '../utils/pdfHelper';

/**
 * Route pour exporter les rapports (Historique) en format CSV ou PDF
 */
export const exporterRapports = async (req: Request, res: Response): Promise<void> => {
  const format = req.query.format as string;
  
  if (format !== 'csv' && format !== 'pdf') {
    throw new AppError('Format invalide. Utilisez format=csv ou format=pdf.', 400);
  }

  // Filtrage similaire à getHistorique
  let baseQuery = db.orm.public.Mouvement;

  if (req.query.dateDebut) {
    const startInstant = Temporal.Instant.from(new Date(req.query.dateDebut as string).toISOString());
    baseQuery = baseQuery.where((m) => m.heure_arrivee.gte(startInstant));
  }
  if (req.query.dateFin) {
    const endInstant = Temporal.Instant.from(new Date(req.query.dateFin as string).toISOString());
    baseQuery = baseQuery.where((m) => m.heure_arrivee.lte(endInstant));
  }
  if (req.query.typeEntree) {
    baseQuery = baseQuery.where({ type_entree: req.query.typeEntree as any });
  }

  // Si aucun filtre de date, on met une limite pour ne pas crasher le serveur (ex: 1000 derniers)
  let limit = 10000;
  
  const query = baseQuery
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
      const dateArr = m.heure_arrivee ? new Date((m.heure_arrivee as any).epochMilliseconds).toLocaleString('fr-FR') : 'N/A';
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

    const { fontRegular, fontBold } = registerVerdanaFont(doc);

    // Appliquer le header (logo centré en haut) et le filigrane (bas droite) sur chaque page
    applyPdfHeaderFooter(doc);

    doc.font(fontBold).fontSize(16).text('Rapport Historique des Passages', 30, 100, { align: 'center' });
    doc.font(fontRegular).fontSize(9).fillColor('#555555').text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 30, 122, { align: 'center' });
    doc.fillColor('#000000');

    const columns = [
      { header: 'Date', x: 30, width: 115 },
      { header: 'Nom/Matricule', x: 145, width: 110 },
      { header: 'Type', x: 255, width: 85 },
      { header: 'Plaque', x: 340, width: 90 },
      { header: 'Agent', x: 430, width: 135 }
    ];
    const headerHeight = 24;
    const rowHeight = 22;

    const renderTableHeader = (currentY: number) => {
      doc.font(fontBold).fontSize(9);
      doc.lineWidth(0.5).strokeColor('#222222');
      
      columns.forEach((col) => {
        doc.rect(col.x, currentY, col.width, headerHeight).fillAndStroke('#24483F', '#222222');
        doc.fillColor('#FFFFFF').text(col.header, col.x + 5, currentY + 7, { width: col.width - 10, align: 'left' });
      });
      doc.font(fontRegular);
    };

    let y = 145;
    renderTableHeader(y);
    y += headerHeight;

    doc.lineWidth(0.5).strokeColor('#444444');

    for (const m of mouvements) {
      if (y > 720) {
        doc.addPage();
        y = 110;
        renderTableHeader(y);
        y += headerHeight;
        doc.lineWidth(0.5).strokeColor('#444444');
      }
      
      const dateArr = m.heure_arrivee ? new Date((m.heure_arrivee as any).epochMilliseconds).toLocaleString('fr-FR') : 'N/A';
      const nom = m.vehicule?.personnel?.utilisateur?.matricule || m.personnel_visite?.utilisateur?.matricule || 'Visiteur';
      const type = m.type_entree || 'N/A';
      const vehicule = m.vehicule?.numero_plaque || 'Aucun';
      const agent = m.agent?.utilisateur?.matricule || '-';

      const rowValues = [String(dateArr), String(nom), String(type), String(vehicule), String(agent)];

      doc.font(fontRegular).fontSize(8.5);
      columns.forEach((col, i) => {
        const val = rowValues[i] ?? '';
        doc.rect(col.x, y, col.width, rowHeight).stroke('#444444');
        doc.fillColor('#000000').text(val, col.x + 5, y + 6, { width: col.width - 10, lineBreak: false });
      });

      y += rowHeight;
    }

    doc.end();
  }
};
