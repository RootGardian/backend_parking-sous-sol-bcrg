import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import {
  getParkingStatut,
  enregistrerEntree,
  enregistrerSortie,
  corrigerMouvement,
  getVehiculesAutorises,
  getPersonnesSurSite
} from '../controllers/mouvement.controller';
import { validate } from '../middlewares/validate.middleware';
import { enregistrerEntreeSchema, enregistrerSortieSchema, corrigerMouvementSchema } from '../validators/registre.schemas';

const router = Router();

// Routes accessibles à Vigile, Supervision, Administrateur
router.get('/parking/statut', verifyToken, authorize(['Vigile', 'Supervision', 'Administrateur']), getParkingStatut);
router.post('/registre/entree', verifyToken, authorize(['Vigile', 'Supervision', 'Administrateur']), validate(enregistrerEntreeSchema), enregistrerEntree);
router.put('/registre/sortie', verifyToken, authorize(['Vigile', 'Supervision', 'Administrateur']), validate(enregistrerSortieSchema), enregistrerSortie);


// Routes pour les listes de consultation du Registre
router.get('/vehicules/autorises', verifyToken, authorize(['Vigile', 'Supervision', 'Administrateur']), getVehiculesAutorises);
router.get('/registre/sur-site', verifyToken, authorize(['Vigile', 'Supervision', 'Administrateur']), getPersonnesSurSite);

// Route accessible uniquement aux Supervision et Administrateur
router.put('/registre/correction/:id_passage', verifyToken, authorize(['Supervision', 'Administrateur']), validate(corrigerMouvementSchema), corrigerMouvement);

export default router;
