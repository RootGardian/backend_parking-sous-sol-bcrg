import { Temporal, Intl, toTemporalInstant } from '@js-temporal/polyfill';
import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// @ts-ignore
globalThis.Temporal = Temporal;
import authRoutes from './routes/auth.routes';
import personnelRoutes from './routes/personnel.routes';
import registreRoutes from './routes/registre.routes';
import adminRoutes from './routes/admin.routes';
import monEspaceRoutes from './routes/mon-espace.routes';
import { verifyToken } from './middlewares/auth.middleware';
import { errorHandler } from './middlewares/error.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger';
import { wsService } from './services/websocket.service';

import cors from 'cors';

dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(helmet());

// Nécessaire si l'API est derrière un reverse proxy (ex: Nginx, Apache, ou un load balancer réseau)
// Permet de récupérer la véritable IP du client (req.ip) plutôt que celle du routeur/proxy.
app.set('trust proxy', 1);

// Limiteur général (prévention DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite à 1000 requêtes
  standardHeaders: 'draft-7', // Renvoie les headers RateLimit-*
  legacyHeaders: false, // Désactive les headers X-RateLimit-*
  message: { error: 'Trop de requêtes, veuillez réessayer dans 15 minutes.' },
  keyGenerator: (req) => req.ip + (req.headers['user-agent'] || '')
});
app.use('/api', globalLimiter);

// Limiteur strict pour la connexion (prévention Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives maximum par matricule
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  keyGenerator: (req) => {
    // Si un matricule est fourni, on limite par compte plutôt que par IP globale
    // Cela permet à plusieurs utilisateurs de se connecter depuis le même réseau Wi-Fi
    if (req.body && req.body.matricule) {
      return req.body.matricule;
    }
    return req.ip + (req.headers['user-agent'] || '');
  }
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

// Routes de l'Espace Personnel
app.use('/api/v1', monEspaceRoutes);

// Route de test protégée par le token JWT
app.get('/api/test-auth', verifyToken, (req: Request, res: Response) => {
  res.json({ message: 'Vous êtes authentifié !', user: req.user });
});

// Gestionnaire global d'erreurs (doit être le dernier middleware)
app.use(errorHandler);

// Initialiser le WebSocket sur le même serveur HTTP
wsService.init(server);

server.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
  console.log(`WebSocket disponible sur ws://localhost:${port}/ws`);
});
