import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', verifyToken, getMe);

router.post('/change-password', verifyToken, changePassword);

export default router;
