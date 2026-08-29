import { Router } from 'express';
import { getPersonnelByMatricule, searchPersonnelByName, addVehiculeToPersonnel } from '../controllers/personnel.controller';
import { searchByPlaque } from '../controllers/vehicule.controller';
import { verifyToken, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Middlewares requis pour toutes ces routes du Terrain
const isAuthorized = authorize(['Vigile', 'Superviseur', 'Administrateur']);
const authMiddleware = [verifyToken, isAuthorized];

// 2. Recherche par QR Code / Matricule
router.get('/personnel/matricule/:matricule', authMiddleware, getPersonnelByMatricule);

// 3. Recherche par Plaque (Plan B)
router.get('/vehicules/recherche', authMiddleware, searchByPlaque);

// 4. Recherche par Nom (Plan C)
router.get('/personnel/recherche', authMiddleware, searchPersonnelByName);

// 5. Ajout de Véhicule à la volée
router.post('/personnel/:id_personne/vehicules', authMiddleware, addVehiculeToPersonnel);

export default router;
