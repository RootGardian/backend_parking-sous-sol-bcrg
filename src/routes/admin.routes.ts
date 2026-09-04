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
  reactiverUtilisateur,
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
  listerFonctions,
  ajouterParking,
  listerParkings,
  modifierParking,
  supprimerParking
} from '../controllers/parking.controller';
import { validate } from '../middlewares/validate.middleware';
import { 
  ajouterPersonnelSchema, 
  modifierPersonnelSchema, 
  ajouterUtilisateurSchema, 
  modifierUtilisateurSchema, 
  creerFonctionEtPlaceSchema, 
  ajouterPlaceVisiteurSchema,
  ajouterParkingSchema,
  modifierParkingSchema
} from '../validators/admin.schemas';
import { paginationSchema } from '../validators/pagination.schemas';


const router = Router();

// Configuration de multer pour stocker temporairement les fichiers uploadés
const upload = multer({ dest: 'uploads/' });

// Route pour l'export des QR Codes (Administrateur uniquement)
router.get('/admin/personnel/qrcodes', verifyToken, authorize(['Administrateur']), exportQRCodes);

// Routes pour l'import massif CSV (Administrateur uniquement)
router.post('/imports/utilisateurs', verifyToken, authorize(['Administrateur']), upload.single('file'), importUtilisateurs);
router.post('/imports/personnel', verifyToken, authorize(['Administrateur']), upload.single('file'), importPersonnel);

// Routes CRUD Personnel individuel (Administrateur uniquement)
router.post('/admin/personnel', verifyToken, authorize(['Administrateur']), validate(ajouterPersonnelSchema), ajouterPersonnel);
router.put('/admin/personnel/:matricule', verifyToken, authorize(['Administrateur']), validate(modifierPersonnelSchema), modifierPersonnel);
router.delete('/admin/personnel/:matricule', verifyToken, authorize(['Administrateur']), supprimerPersonnel);
router.put('/admin/personnel/:matricule/reactiver', verifyToken, authorize(['Administrateur']), reactiverUtilisateur);

// Routes CRUD Utilisateurs Système (Agents, Supervisions, Admins)
router.post('/admin/utilisateurs', verifyToken, authorize(['Administrateur']), validate(ajouterUtilisateurSchema), ajouterUtilisateur);
router.put('/admin/utilisateurs/:matricule', verifyToken, authorize(['Administrateur']), validate(modifierUtilisateurSchema), modifierUtilisateur);
router.delete('/admin/utilisateurs/:matricule', verifyToken, authorize(['Administrateur']), supprimerPersonnel);
router.put('/admin/utilisateurs/:matricule/reactiver', verifyToken, authorize(['Administrateur']), reactiverUtilisateur);
router.get('/admin/utilisateurs', verifyToken, authorize(['Administrateur', 'Supervision']), getUtilisateurs);
router.get('/admin/utilisateurs/stats', verifyToken, authorize(['Administrateur', 'Supervision']), getUtilisateursStats);



// Routes Historique et Statistiques (Administrateur et Supervision)
router.get('/admin/historique', verifyToken, authorize(['Administrateur', 'Supervision']), validate(paginationSchema), getHistorique);
router.get('/admin/statistiques', verifyToken, authorize(['Administrateur', 'Supervision']), getDashboardStats);

// Routes Vehicules (Flotte)
router.get('/admin/vehicules', verifyToken, authorize(['Administrateur', 'Supervision']), getVehicules);
router.get('/admin/vehicules/stats', verifyToken, authorize(['Administrateur', 'Supervision']), getFlotteStats);

router.get('/admin/rapports', verifyToken, authorize(['Administrateur', 'Supervision']), exporterRapports);
router.get('/admin/audit-logs', verifyToken, authorize(['Administrateur']), getAuditLogs);

// Routes Parking & Fonctions (Administrateur uniquement pour modification, lecture pour Supervision)
router.post('/admin/fonctions', verifyToken, authorize(['Administrateur']), validate(creerFonctionEtPlaceSchema), creerFonctionEtPlace);
router.delete('/admin/fonctions/:id_fonction', verifyToken, authorize(['Administrateur']), supprimerFonction);
router.get('/admin/fonctions', verifyToken, authorize(['Administrateur', 'Supervision']), listerFonctions);

router.post('/admin/parking/visiteurs', verifyToken, authorize(['Administrateur']), validate(ajouterPlaceVisiteurSchema), ajouterPlaceVisiteur);
router.delete('/admin/parking/visiteurs/:id_place', verifyToken, authorize(['Administrateur']), supprimerPlaceVisiteur);
router.get('/admin/parking/places', verifyToken, authorize(['Administrateur', 'Supervision']), listerPlacesParking);

// Nouveaux CRUD Parking
router.post('/admin/parkings', verifyToken, authorize(['Administrateur']), validate(ajouterParkingSchema), ajouterParking);
router.get('/admin/parkings', verifyToken, authorize(['Administrateur', 'Supervision']), listerParkings);
router.put('/admin/parkings/:id', verifyToken, authorize(['Administrateur']), validate(modifierParkingSchema), modifierParking);
router.delete('/admin/parkings/:id', verifyToken, authorize(['Administrateur']), supprimerParking);

export default router;
