import { Router } from 'express';
import { getPersonnel, addVehiculeToPersonnel, downloadQRCode } from '../controllers/personnel.controller';
import { getVehicules } from '../controllers/vehicule.controller';
import { verifyToken, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { addVehiculeSchema } from '../validators/personnel.schemas';


const router = Router();

// Middlewares requis pour toutes ces routes du Terrain
const isAuthorized = authorize(['Vigile', 'Supervision', 'Administrateur']);
const authMiddleware = [verifyToken, isAuthorized];

// 2 & 4. Recherche de Personnel (par matricule ou nom via query params)
router.get('/personnel', authMiddleware, getPersonnel);

// 5. Ajout de Véhicule à la volée
router.post('/personnel/:matricule/vehicules', authMiddleware, validate(addVehiculeSchema), addVehiculeToPersonnel);

// 3. Recherche de Véhicules (par plaque via query params)
router.get('/vehicules', authMiddleware, getVehicules);


// 6. Télécharger le QR Code
router.get('/personnel/:matricule/qrcode', authMiddleware, downloadQRCode);

export default router;
