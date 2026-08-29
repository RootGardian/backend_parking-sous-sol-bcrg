import { Temporal, Intl, toTemporalInstant } from '@js-temporal/polyfill';
import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// @ts-ignore
globalThis.Temporal = Temporal;
import authRoutes from './routes/auth.routes';
import personnelRoutes from './routes/personnel.routes';
import registreRoutes from './routes/registre.routes';
import adminRoutes from './routes/admin.routes';
import { verifyToken } from './middlewares/auth.middleware';
import { errorHandler } from './middlewares/error.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger';

import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(helmet());

// Limiteur général (prévention DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite à 1000 requêtes
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api', globalLimiter);

// Limiteur strict pour la connexion (prévention Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives maximum
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

// Route de base
app.get('/', (_req: Request, res: Response) => {
  res.send('API Parking BCRG opérationnelle.');
});

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes d'authentification (avec limitation stricte)
app.use('/api/auth', loginLimiter, authRoutes);

// Routes du Sprint 2 (VIP & Vehicules)
app.use('/api/v1', personnelRoutes);
app.use('/api/v1', registreRoutes);
app.use('/api/v1', adminRoutes);

// Route de test protégée par le token JWT
app.get('/api/test-auth', verifyToken, (req: Request, res: Response) => {
  res.json({ message: 'Vous êtes authentifié !', user: req.user });
});

// Gestionnaire global d'erreurs (doit être le dernier middleware)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
