import { Router } from 'express';
import multer from 'multer';
import { verifyToken, authorize } from '../middlewares/auth.middleware';
import { 
  exportQRCodes, 
  importUtilisateurs, 
  importPersonnel, 
  ajouterPersonnel, 
  modifierPersonnel, 
  supprimerPersonnel,
  ajouterUtilisateur,
  modifierUtilisateur 
} from '../controllers/admin.controller';
import { getHistorique, getDashboardStats } from '../controllers/stats.controller';
import { exporterRapports } from '../controllers/rapports.controller';
import { getAuditLogs } from '../controllers/audit.controller';

const router = Router();

// Configuration de multer pour stocker temporairement les fichiers uploadés
const upload = multer({ dest: 'uploads/' });

// Route pour l'export des QR Codes (Administrateur uniquement)
router.get('/admin/personnel/qrcodes', verifyToken, authorize(['Administrateur']), exportQRCodes);

// Routes pour l'import massif CSV (Administrateur uniquement)
router.post('/imports/utilisateurs', verifyToken, authorize(['Administrateur']), upload.single('file'), importUtilisateurs);
router.post('/imports/personnel', verifyToken, authorize(['Administrateur']), upload.single('file'), importPersonnel);

// Routes CRUD Personnel individuel (Administrateur uniquement)
router.post('/admin/personnel', verifyToken, authorize(['Administrateur']), ajouterPersonnel);
router.put('/admin/personnel/:matricule', verifyToken, authorize(['Administrateur']), modifierPersonnel);
router.delete('/admin/personnel/:matricule', verifyToken, authorize(['Administrateur']), supprimerPersonnel);

// Routes CRUD Utilisateurs Système (Agents, Superviseurs, Admins)
router.post('/admin/utilisateurs', verifyToken, authorize(['Administrateur']), ajouterUtilisateur);
router.put('/admin/utilisateurs/:matricule', verifyToken, authorize(['Administrateur']), modifierUtilisateur);
router.delete('/admin/utilisateurs/:matricule', verifyToken, authorize(['Administrateur']), supprimerPersonnel);

// Routes Historique et Statistiques (Administrateur et Superviseur)
router.get('/admin/historique', verifyToken, authorize(['Administrateur', 'Superviseur']), getHistorique);
router.get('/admin/statistiques', verifyToken, authorize(['Administrateur', 'Superviseur']), getDashboardStats);
router.get('/admin/rapports', verifyToken, authorize(['Administrateur', 'Superviseur']), exporterRapports);
router.get('/admin/audit-logs', verifyToken, authorize(['Administrateur']), getAuditLogs);

export default router;
