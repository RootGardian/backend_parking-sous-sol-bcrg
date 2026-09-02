# Parking BCRG - API Backend

Le projet Parking BCRG est le systeme de gestion des entrees et sorties pour le parking de la Banque Centrale de la Republique de Guinee (BCRG). Ce depot contient le code source de l'API Backend.

## Architecture et Technologies

L'API est construite avec les technologies modernes suivantes :
- Node.js (v24+) & TypeScript
- Framework Web : Express.js (v5)
- Base de Donnees : PostgreSQL
- ORM : Prisma Next (Prisma 8) avec son moteur ORM et SQL.
- Securite : JSON Web Tokens (JWT), Bcrypt, Helmet, Express Rate Limit
- Generation de codes : QRCode

## Securite et RBAC (Role-Based Access Control)

L'API est securisee par une architecture RBAC stricte avec trois profils distincts :

1. Administrateur
   - Droits exclusifs : Gestion individuelle du personnel (CRUD), imports de masse via CSV, generation de QR Codes, consultation globale des historiques et statistiques.
   - Herite de tous les droits des autres profils.
   - Suppression douce (Soft Delete) : Desactivation des profils au lieu d'une suppression en base pour preserver l'historique d'audit.

2. Supervision
   - Droits exclusifs de supervision : Peut corriger manuellement un mouvement enregistre par erreur dans le registre.
   - Consultation : Acces aux statistiques et a l'historique.
   - Herite des droits de l'agent.

3. Agent (Vigile)
   - Droits operationnels : Recherche d'un personnel, listing des vehicules autorises et des personnes presentes sur site.
   - Enregistrement des mouvements : Enregistrement des entrees et sorties via les donnees scannees.

4. Personnel (Utilisateur final)
   - Profil en lecture seule : Espace personnel (Self-service).
   - Droits : Consultation de son propre historique, de l'état de son véhicule, de sa place de parking, et affichage de son QR Code.

### Protections anti-abus et Validation
- Helmet : Cache les headers techniques de l'API.
- Rate Limiter Global : 1000 requetes maximum par 15 minutes par IP.
- Rate Limiter Authentification : 10 tentatives de connexion maximum par 15 minutes pour bloquer les attaques de force brute.
- Validation Stricte (Zod) : Toutes les requêtes entrantes sont validées (types, champs inattendus rejetés) avant traitement.
- Hashage des mots de passe : Salt dynamique + Pepper statique via Bcrypt.
- Politique de mot de passe fort : Les mots de passe modifiés doivent contenir au moins 12 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial.
- Politique de 1ère connexion : Les comptes créés ou importés ont leur matricule comme mot de passe par défaut, et sont obligés de le changer à leur première connexion (`doit_changer_mdp`).

### Calcul Dynamique
- Statistiques : La capacité maximale du parking utilisée pour le calcul du taux d'occupation est déduite dynamiquement depuis la base de données (table `PlaceParking`).

## Pre-requis

- Node.js (version 24 LTS ou superieure)
- PostgreSQL
- Npm ou Yarn

## Installation et Lancement

1. Cloner le depot et installer les dependances :
   ```bash
   npm install
   ```
   Note: `@js-temporal/polyfill` est requis pour le bon fonctionnement des dates (`timestamptz`) sous Prisma Next.

2. Configurer les variables d'environnement dans un fichier `.env` a la racine :
   ```env
   DATABASE_URL="postgresql://utilisateur:motdepasse@localhost:5432/parking_bcrg?schema=public"
   JWT_SECRET="votre_cle_secrete_ultra_securisee"
   JWT_EXPIRES_IN="24h"
   PASSWORD_PEPPER="votre_pepper_pour_le_hachage"
   ```

3. Initialiser la base de donnees et appliquer le contrat Prisma :
   ```bash
   npm run db:init
   ```

4. Generer les artefacts Prisma :
   ```bash
   npm run contract:emit
   ```

5. Lancer l'API en mode developpement :
   ```bash
   npm run dev
   ```
   L'API sera accessible sur `http://localhost:3000`.

## Scripts Utiles

- `npm run dev` : Lancement du serveur avec nodemon.
- `npm run start` : Lancement en mode production (ts-node).
- `npx tsx test-e2e.ts` : Lance les tests end-to-end de l'API.
- `npm run db:init` : Initialise manuellement la base de donnees.
- `npm run migration:plan` : Prepare une nouvelle migration SQL.
- `npm run migrate` : Applique la migration planifiee.

## Reference de l'API (Endpoints Principaux)

Toutes les routes (hormis la connexion) exigent un header `Authorization: Bearer <TOKEN>`.

### Authentification

- `GET /api/auth/me` : Obtenir les informations du profil de l'utilisateur connecté (Nécessite un Token JWT).
- `POST /api/auth/login` : Connexion et recuperation du token JWT.
- `POST /api/auth/change-password` : Modifier son mot de passe (notamment lors de la 1ère connexion obligatoire).

### Espace Personnel (Consultation)
- `GET /api/v1/mon-espace/profil` : Mon profil.
- `GET /api/v1/mon-espace/qrcode` : Mon QR Code.
- `GET /api/v1/mon-espace/historique` : Mon historique de passages.
- `GET /api/v1/mon-espace/statut` : Mon statut actuel sur site.
- `GET /api/v1/mon-espace/vehicules` : Mes véhicules enregistrés.
- `GET /api/v1/mon-espace/place` : Ma place de parking attitrée.

### Operationnel (Vigiles & Supervisions)
- `POST /api/v1/registre/entree` : Enregistrer une entree (Personnel ou Visiteur).
- `PUT /api/v1/registre/sortie/:id_passage` : Enregistrer une sortie.
- `GET /api/v1/personnel/matricule/:id` : Consulter les informations d'un personnel.
- `GET /api/v1/registre/vehicules-autorises` : Lister les vehicules autorises.
- `GET /api/v1/registre/personnel-sur-site` : Voir qui est present sur le site.
- `PUT /api/v1/registre/correction/:id_passage` : Corriger un mouvement (Supervision et Admin uniquement).

### Administration (Administrateurs uniquement)
- `POST /api/v1/admin/personnel` : Creer un compte personnel.
- `PUT /api/v1/admin/personnel/:matricule` : Mettre a jour un profil personnel.
- `DELETE /api/v1/admin/personnel/:matricule` : Supprimer (Soft Delete) un profil personnel.
- `POST /api/v1/admin/utilisateurs` : Creer manuellement un Agent, Supervision ou Admin.
- `PUT /api/v1/admin/utilisateurs/:matricule` : Modifier le profil ou mot de passe d'un Agent/Supervision/Admin.
- `DELETE /api/v1/admin/utilisateurs/:matricule` : Desactiver un Agent, Supervision ou Admin.
- `POST /api/v1/imports/personnel` : Import CSV massif pour le personnel.
- `GET /api/v1/admin/personnel/qrcodes` : Exporter les QR Codes du personnel actif.
- `GET /api/v1/admin/historique` : Historique paginé des mouvements avec filtres.
- `GET /api/v1/admin/statistiques` : Chiffres clés pour le tableau de bord (taux d'occupation, flux horaires, etc).
- `GET /api/v1/admin/utilisateurs` : Liste complète des comptes (Administrateurs, Supervisions, Agents).
- `GET /api/v1/admin/utilisateurs/stats` : Statistiques de répartition des comptes par rôle.
- `GET /api/v1/admin/vehicules` : Liste complète des véhicules enregistrés.
- `GET /api/v1/admin/vehicules/stats` : Statistiques de répartition des véhicules.
- `GET /api/v1/admin/rapports` : Exporter le rapport d'historique en format PDF (avec logo) ou CSV.
- `GET /api/v1/admin/audit-logs` : Journal d'Audit de Sécurité (traçabilité des actions sensibles par les Admins/Supervisions).
