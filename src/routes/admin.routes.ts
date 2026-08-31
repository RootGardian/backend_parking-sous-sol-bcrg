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
  modifierUtilisateur,
  getUtilisateurs,
  getUtilisateursStats
} from '../controllers/admin.controller';
import { getHistorique, getDashboardStats } from '../controllers/stats.controller';
import { getVehicules, getFlotteStats } from '../controllers/vehicule.controller';
import { exporterRapports } from '../controllers/rapports.controller';
import { getAuditLogs } from '../controllers/audit.controller';
import { 
  creerFonctionEtPlace, 
  supprimerFonction,
  ajouterPlaceVisiteur, 
  supprimerPlaceVisiteur, 
  listerPlacesParking, 
  listerFonctions 
} from '../controllers/parking.controller';

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
router.get('/admin/utilisateurs', verifyToken, authorize(['Administrateur', 'Superviseur']), getUtilisateurs);
router.get('/admin/utilisateurs/stats', verifyToken, authorize(['Administrateur', 'Superviseur']), getUtilisateursStats);

// Routes Historique et Statistiques (Administrateur et Superviseur)
router.get('/admin/historique', verifyToken, authorize(['Administrateur', 'Superviseur']), getHistorique);
router.get('/admin/statistiques', verifyToken, authorize(['Administrateur', 'Superviseur']), getDashboardStats);

// Routes Vehicules (Flotte)
router.get('/admin/vehicules', verifyToken, authorize(['Administrateur', 'Superviseur']), getVehicules);
router.get('/admin/vehicules/stats', verifyToken, authorize(['Administrateur', 'Superviseur']), getFlotteStats);

router.get('/admin/rapports', verifyToken, authorize(['Administrateur', 'Superviseur']), exporterRapports);
router.get('/admin/audit-logs', verifyToken, authorize(['Administrateur']), getAuditLogs);

// Routes Parking & Fonctions (Administrateur uniquement pour modification, lecture pour Superviseur)
router.post('/admin/fonctions', verifyToken, authorize(['Administrateur']), creerFonctionEtPlace);
router.delete('/admin/fonctions/:id_fonction', verifyToken, authorize(['Administrateur']), supprimerFonction);
router.get('/admin/fonctions', verifyToken, authorize(['Administrateur', 'Superviseur']), listerFonctions);

router.post('/admin/parking/visiteurs', verifyToken, authorize(['Administrateur']), ajouterPlaceVisiteur);
router.delete('/admin/parking/visiteurs/:id_place', verifyToken, authorize(['Administrateur']), supprimerPlaceVisiteur);
router.get('/admin/parking', verifyToken, authorize(['Administrateur', 'Superviseur']), listerPlacesParking);

export default router;
