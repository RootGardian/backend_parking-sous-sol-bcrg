import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import {
  getParkingStatut,
  enregistrerEntree,
  enregistrerSortie,
  corrigerMouvement,
  getVehiculesAutorises,
  getGouverneursAutorises,
  getPersonnelSurSite,
  getVisiteursSurSite
} from '../controllers/mouvement.controller';

const router = Router();

// Routes accessibles à Vigile, Superviseur, Administrateur
router.get('/parking/statut', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), getParkingStatut);
router.post('/registre/entree', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), enregistrerEntree);
router.put('/registre/sortie/:id_passage', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), enregistrerSortie);

// Routes pour les listes déroulantes de l'application
router.get('/registre/vehicules-autorises', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), getVehiculesAutorises);
router.get('/registre/gouverneurs', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), getGouverneursAutorises);
router.get('/registre/personnel-sur-site', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), getPersonnelSurSite);
router.get('/registre/visiteurs-sur-site', verifyToken, authorize(['Vigile', 'Superviseur', 'Administrateur']), getVisiteursSurSite);

// Route accessible uniquement aux Superviseur et Administrateur
router.put('/registre/correction/:id_passage', verifyToken, authorize(['Superviseur', 'Administrateur']), corrigerMouvement);

export default router;
