import { Router } from 'express';
import { verifyToken, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { paginationSchema } from '../validators/pagination.schemas';
import {
  getMonProfil,
  getMonQRCode,
  getMonHistorique,
  getMonStatut,
  getMesVehicules,
  getMaPlace
} from '../controllers/mon-espace.controller';

const router = Router();

// Toutes les routes de cet espace sont réservées au rôle Personnel
router.use('/mon-espace', verifyToken, authorize(['Personnel']));

router.get('/mon-espace/profil', getMonProfil);
router.get('/mon-espace/qrcode', getMonQRCode);

router.get('/mon-espace/historique', verifyToken, authorize(['Personnel', 'Administrateur', 'Supervision']), validate(paginationSchema), getMonHistorique);
router.get('/mon-espace/statut', getMonStatut);
router.get('/mon-espace/vehicules', getMesVehicules);
router.get('/mon-espace/place', getMaPlace);

export default router;
