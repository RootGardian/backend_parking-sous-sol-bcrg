import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, changePasswordSchema } from '../validators/auth.schemas';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', verifyToken, getMe);

router.post('/change-password', verifyToken, validate(changePasswordSchema), changePassword);

export default router;
