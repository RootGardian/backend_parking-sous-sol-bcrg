import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'default_secret';

/** Format d'un message WebSocket envoyé aux clients */
export interface WsMessage {
  event: string;
  data: any;
  timestamp: string;
}

/** Client WebSocket authentifié avec ses métadonnées */
interface AuthenticatedClient {
  ws: WebSocket;
  userId: number;
  roles: string[];
  isAlive: boolean;
}

/**
 * Service WebSocket singleton pour les mises à jour en temps réel.
 * 
 * S'attache au serveur HTTP d'Express et gère :
 * - Authentification JWT via query parameter `?token=xxx`
 * - Broadcast vers tous les clients ou filtré par rôle
 * - Heartbeat (ping/pong) pour détecter les connexions mortes
 */
class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, AuthenticatedClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialise le serveur WebSocket sur le serveur HTTP existant.
   */
  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat toutes les 30s pour détecter les connexions mortes
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          console.log(`[WS] Client mort détecté (user ${client.userId}), déconnexion.`);
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        client.isAlive = false;
        ws.ping();
      });
    }, 30_000);

    this.wss.on('close', () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    console.log('[WS] Serveur WebSocket initialisé sur /ws');
  }

  /**
   * Gère une nouvelle connexion WebSocket entrante.
   * Vérifie le token JWT passé en query parameter.
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Token manquant');
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        ws.close(4003, 'Token invalide ou expiré');
        return;
      }

      const roles: string[] = Array.isArray(decoded.role) ? decoded.role : [decoded.role];

      const client: AuthenticatedClient = {
        ws,
        userId: decoded.id,
        roles,
        isAlive: true
      };

      this.clients.set(ws, client);

      console.log(`[WS] Client connecté: user ${decoded.id} (rôles: ${roles.join(', ')})`);

      // Répondre au pong pour le heartbeat
      ws.on('pong', () => {
        const c = this.clients.get(ws);
        if (c) c.isAlive = true;
      });

      ws.on('close', () => {
        console.log(`[WS] Client déconnecté: user ${decoded.id}`);
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Erreur client user ${decoded.id}:`, err.message);
        this.clients.delete(ws);
      });

      // Message de bienvenue
      this.send(ws, {
        event: 'connected',
        data: { message: 'Connexion WebSocket établie.', userId: decoded.id },
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('[WS] Erreur lors de la connexion:', err);
      ws.close(4000, 'Erreur interne');
    }
  }

  /**
   * Envoie un message à un client spécifique.
   */
  private send(ws: WebSocket, message: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Diffuse un événement à TOUS les clients connectés.
   */
  broadcast(event: string, data: any): void {
    const message: WsMessage = {
      event,
      data,
      timestamp: new Date().toISOString()
    };

    const payload = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }

  /**
   * Diffuse un événement uniquement aux clients ayant l'un des rôles spécifiés.
   * Les rôles attendus sont les valeurs internes : 'admin', 'supervision', 'agent', 'personnel'.
   */
  broadcastToRoles(roles: string[], event: string, data: any): void {
    const message: WsMessage = {
      event,
      data,
      timestamp: new Date().toISOString()
    };

    const payload = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        const hasRole = client.roles.some(r => roles.includes(r));
        if (hasRole) {
          client.ws.send(payload);
        }
      }
    });
  }

  /**
   * Retourne le nombre de clients actuellement connectés.
   */
  getConnectedCount(): number {
    return this.clients.size;
  }
}

// Export du singleton
export const wsService = new WebSocketService();
