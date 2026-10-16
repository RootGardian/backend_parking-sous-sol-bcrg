import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/AppError';

export interface BcrgHubSsoPayload {
  sub?: number | string;
  id?: number | string;
  matricule: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nom?: string;
  prenom?: string;
  department?: string;
  role?: string;
  aud?: string;
  app_id?: number | string;
  app_name?: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

class SsoService {
  private cachedPublicKey: string | null = null;
  private cacheExpiresAt: number = 0;

  /**
   * Récupère la clé publique RSA depuis le point de découverte JWKS du BCRG HUB
   * avec mise en cache mémoire (1 heure).
   */
  private async getJwksPublicKey(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedPublicKey && this.cacheExpiresAt > now) {
      return this.cachedPublicKey;
    }

    const jwksUrl = process.env.BCRG_HUB_JWKS_URL;
    if (!jwksUrl) return null;

    try {
      const response = await fetch(jwksUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(1500),
      });

      if (!response.ok) {
        console.warn(`[SSO] Échec d'interrogation JWKS (${response.statusText})`);
        return null;
      }

      const data: any = await response.json();
      const keyObj = data?.keys?.[0];

      if (keyObj && typeof keyObj.publicKeyPem === 'string' && keyObj.publicKeyPem.includes('BEGIN PUBLIC KEY')) {
        this.cachedPublicKey = keyObj.publicKeyPem;
        this.cacheExpiresAt = now + 60 * 60 * 1000; // 1 heure de cache
        return this.cachedPublicKey;
      }
    } catch (err: any) {
      console.warn(`[SSO] Impossible de joindre le JWKS du HUB: ${err.message}. Bascule sur la clé locale.`);
    }

    return null;
  }

  /**
   * Récupère la clé publique RSA de secours locale
   */
  private getLocalPublicKey(): string | null {
    // 1. Variable d'environnement directe
    if (process.env.BCRG_HUB_PUBLIC_KEY) {
      return process.env.BCRG_HUB_PUBLIC_KEY.replace(/\\n/g, '\n');
    }

    // 2. Chemin spécifié dans l'environnement
    const customPath = process.env.BCRG_HUB_PUBLIC_KEY_PATH;
    if (customPath) {
      const resolvedPath = path.isAbsolute(customPath)
        ? customPath
        : path.join(__dirname, '../../', customPath);
      if (fs.existsSync(resolvedPath)) {
        return fs.readFileSync(resolvedPath, 'utf8');
      }
    }

    // 3. Fichier par défaut bcrg_hub_public.pem
    const defaultFile = path.join(__dirname, '../config/bcrg_hub_public.pem');
    if (fs.existsSync(defaultFile)) {
      return fs.readFileSync(defaultFile, 'utf8');
    }

    return null;
  }

  /**
   * Valide un jeton SSO émis par le BCRG HUB (OIDC / JWT).
   * Supporte la signature asymétrique RS256 (JWKS + PEM local)
   * et le repli symétrique HS256 (JWT_SECRET du HUB).
   */
  async verifyHubToken(token: string): Promise<BcrgHubSsoPayload> {
    if (!token || typeof token !== 'string') {
      throw new AppError('Jeton SSO BCRG manquant ou invalide.', 400);
    }

    // Décodage préliminaire pour identifier l'algorithme
    const decodedUnverified = jwt.decode(token, { complete: true });
    if (!decodedUnverified || typeof decodedUnverified !== 'object') {
      throw new AppError('Structure de jeton SSO invalide.', 401);
    }

    const alg = decodedUnverified.header?.alg;

    let payload: any = null;

    if (alg === 'RS256') {
      // 1. Tenter la clé publique JWKS dynamique
      let publicKey = await this.getJwksPublicKey();

      // 2. Repli vers le fichier PEM local
      if (!publicKey) {
        publicKey = this.getLocalPublicKey();
      }

      if (!publicKey) {
        throw new AppError('Clé publique de signature du BCRG HUB introuvable.', 500);
      }

      try {
        payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } catch (err: any) {
        // Si la clé en cache a échoué, on purge le cache et on retente une fois avec le local
        const localKey = this.getLocalPublicKey();
        if (localKey && localKey !== publicKey) {
          try {
            payload = jwt.verify(token, localKey, { algorithms: ['RS256'] });
          } catch (retryErr: any) {
            throw new AppError(`Jeton SSO RSA invalide ou expiré : ${retryErr.message}`, 401);
          }
        } else {
          throw new AppError(`Jeton SSO RSA invalide ou expiré : ${err.message}`, 401);
        }
      }
    } else if (alg === 'HS256') {
      const symmetricSecret = process.env.BCRG_HUB_JWT_SECRET || 'supersecret_sso_portal_key_2026';
      try {
        payload = jwt.verify(token, symmetricSecret, { algorithms: ['HS256'] });
      } catch (err: any) {
        throw new AppError(`Jeton SSO HMAC invalide ou expiré : ${err.message}`, 401);
      }
    } else {
      throw new AppError(`Algorithme de jeton non pris en charge : ${alg}`, 401);
    }

    if (!payload.matricule) {
      throw new AppError('Le jeton SSO ne contient pas de matricule utilisateur valide.', 400);
    }

    return payload as BcrgHubSsoPayload;
  }
}

export const ssoService = new SsoService();
