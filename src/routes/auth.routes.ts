import { Router } from 'express';
import { login, ssoLogin, singleLogout, getMe, changePassword } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, changePasswordSchema } from '../validators/auth.schemas';

const router = Router();

// Authentification classique (identifiants / mot de passe local)
router.post('/login', validate(loginSchema), login);

// Authentification SSO BCRG HUB (OIDC / Active Directory)
router.post('/sso-login', ssoLogin);
router.post('/sso', ssoLogin);

// Récepteur Single Logout (SLO) déclenché par le BCRG HUB
router.post('/slo', singleLogout);

// Informations de session et changement de mot de passe
router.get('/me', verifyToken, getMe);
router.post('/change-password', verifyToken, validate(changePasswordSchema), changePassword);

export default router;
