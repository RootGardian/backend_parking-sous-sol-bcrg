export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Parking BCRG',
    version: '2.0.0',
    description: `
## Documentation Officielle ÔÇö API Parking Sous-Sol BCRG

Cette API g├¿re l'ensemble du syst├¿me de contr├┤le d'acc├¿s et de surveillance du parking souterrain de la BCRG.

### Authentification
Toutes les routes prot├®g├®es n├®cessitent un **Bearer Token JWT** dans l'en-t├¬te \`Authorization\`.
Le token est obtenu via \`POST /api/auth/login\` et dure **24 heures**.

### Politique de Mot de Passe
Les mots de passe doivent contenir au minimum :
- **12 caract├¿res**
- **1 lettre majuscule**
- **1 chiffre**
- **1 caract├¿re sp├®cial** (ex: \`!\`, \`@\`, \`#\`, etc.)

### Format de R├®ponse Pagin├®e
Les routes retournant des listes utilisent le format suivant :
\`\`\`json
{
  "data": [...],
  "meta": { "total": 120, "page": 1, "limit": 50, "totalPages": 3 }
}
\`\`\`

### R├┤les
- **Administrateur** : Acc├¿s complet
- **Supervision** : Rapports, statistiques, corrections
- **Agent** : Op├®rations terrain (entr├®es/sorties)
- **Personnel** : Espace personnel uniquement (lecture)

---

### ­ƒöî WebSocket ÔÇö Mises ├á jour en temps r├®el

**URL de connexion** : \`ws://<host>/ws?token=<JWT>\`

Le serveur expose un canal WebSocket pour recevoir les mises ├á jour en temps r├®el.
Le token JWT (obtenu via \`POST /api/auth/login\`) doit ├¬tre pass├® en **query parameter** \`token\`.

#### Codes de fermeture
| Code | Signification |
|------|---------------|
| 4001 | Token manquant |
| 4003 | Token invalide ou expir├® |
| 4000 | Erreur interne serveur |

#### Format des messages
Chaque message re├ºu est un objet JSON :
\`\`\`json
{
  "event": "mouvement:entree",
  "data": { ... },
  "timestamp": "2026-09-17T18:00:00.000Z"
}
\`\`\`

#### ├ëv├®nements disponibles
| ├ëv├®nement | Description | R├┤les cibl├®s |
|-----------|-------------|--------------|
| \`connected\` | Confirmation de connexion | Tous |
| \`mouvement:entree\` | Nouvelle entr├®e enregistr├®e | Tous |
| \`mouvement:sortie\` | Sortie enregistr├®e | Tous |
| \`mouvement:correction\` | Mouvement corrig├® ou annul├® | Tous |
| \`parking:statut\` | Statut des places modifi├® | Tous |
| \`dashboard:refresh\` | Signal de rafra├«chissement du dashboard | Tous |
| \`personnel:update\` | CRUD personnel/utilisateurs | Admin, Supervision |
| \`fonction:update\` | Cr├®ation/suppression de fonction | Admin, Supervision |

#### Exemple JavaScript
\`\`\`javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=' + jwt);
ws.onmessage = (event) => {
  const { event: eventName, data, timestamp } = JSON.parse(event.data);
  console.log(eventName, data);
};
\`\`\`
    `,
  },
  servers: [
    {
      url: 'https://backend-parking-sous-sol-bcrg.onrender.com',
      description: 'Serveur de Production (Render)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Serveur de D├®veloppement Local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenu via POST /api/auth/login',
      },
    },
    schemas: {
      // ÔöÇÔöÇÔöÇ Erreurs ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Une erreur est survenue.' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Donn├®es invalides.' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'nouveau_mot_de_passe' },
                message: { type: 'string', example: 'Le mot de passe doit contenir au moins 12 caract├¿res.' },
              }
            }
          }
        },
      },
      // ÔöÇÔöÇÔöÇ Pagination Meta ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 120, description: 'Nombre total d\'enregistrements' },
          page: { type: 'integer', example: 1, description: 'Page courante' },
          limit: { type: 'integer', example: 10, description: 'Nombre d\'├®l├®ments par page' },
          totalPages: { type: 'integer', example: 3, description: 'Nombre total de pages' },
        }
      },
      // ÔöÇÔöÇÔöÇ Auth ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      LoginRequest: {
        type: 'object',
        required: ['matricule', 'mot_de_passe'],
        properties: {
          matricule: { type: 'string', example: 'ADM-001' },
          mot_de_passe: { type: 'string', example: 'MonMotDePasse!' },
        }
      },
      AuthTokenResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Connexion r├®ussie.' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          doit_changer_mdp: { type: 'boolean', example: false, description: 'Si true, l\'utilisateur doit changer son mot de passe avant de continuer.' },
          profil: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              nom: { type: 'string', example: 'Sow' },
              prenom: { type: 'string', example: 'Mamadou' },
              matricule: { type: 'string', example: 'ADM-001' },
              role: { type: 'array', items: { type: 'string' }, example: ['admin'] },
            }
          }
        }
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['nouveau_mot_de_passe'],
        description: '**Politique :** Min. 12 caract├¿res, 1 majuscule, 1 chiffre, 1 caract├¿re sp├®cial.',
        properties: {
          nouveau_mot_de_passe: { type: 'string', example: 'NouveauMdpS├®curis├®123!' }
        }
      },
      PasswordResetResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Mot de passe r├®initialis├® avec succ├¿s.' },
          matricule: { type: 'string', example: 'EMP-001' },
          mot_de_passe_temporaire: { type: 'string', example: 'BCrgP@rking@2026' },
          doit_changer_mdp: { type: 'boolean', example: true }
        }
      },
      PersonnelStatsResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 28, description: 'Total exact du personnel (hors utilisateurs syst├¿me)' },
          direction_cadres: { type: 'integer', example: 4, description: 'Total direction & cadres' },
          vehicules_rattaches: { type: 'integer', example: 10, description: 'Total v├®hicules rattach├®s au personnel' },
          comptes_actifs: { type: 'integer', example: 10, description: 'Total comptes personnel actifs' }
        }
      },
      UserMeResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nom: { type: 'string', example: 'Sow' },
          prenom: { type: 'string', example: 'Mamadou' },
          matricule: { type: 'string', example: 'ADM-001' },
          role: { type: 'array', items: { type: 'string' }, example: ['admin'] },
          est_actif: { type: 'boolean', example: true },
          doit_changer_mdp: { type: 'boolean', example: false },
          personnel: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              fonction: { type: 'object', properties: { nom: { type: 'string', example: 'Directeur' } } },
              vehicules: { type: 'array', items: { $ref: '#/components/schemas/Vehicule' } },
              qr_code: { type: 'string', description: 'Image base64 du QR Code' }
            }
          },
          agent: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              id_parking: { type: 'integer', nullable: true, description: 'ID du parking assign├® (Agent uniquement)' }
            }
          }
        }
      },
      // ÔöÇÔöÇÔöÇ Entit├®s ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      Personnel: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          id_utilisateur: { type: 'integer', example: 5 },
          qr_code: { type: 'string', nullable: true },
          utilisateur: {
            type: 'object',
            properties: {
              nom: { type: 'string', example: 'Diallo' },
              prenom: { type: 'string', example: 'Fatoumata' },
              matricule: { type: 'string', example: 'EMP-042' },
              est_actif: { type: 'boolean', example: true },
            }
          },
          fonction: {
            type: 'object',
            nullable: true,
            properties: {
              nom: { type: 'string', example: 'Directeur' },
              places_parking: { type: 'array', items: { $ref: '#/components/schemas/PlaceParking' } }
            }
          },
          vehicules: { type: 'array', items: { $ref: '#/components/schemas/Vehicule' } }
        }
      },
      Vehicule: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 7 },
          numero_plaque: { type: 'string', example: 'RC-1234' },
          marque: { type: 'string', nullable: true, example: 'Toyota' },
          couleur: { type: 'string', nullable: true, example: 'Blanc' },
          type: { type: 'string', enum: ['personnel', 'visiteur'], example: 'personnel' },
        }
      },
      PlaceParking: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3 },
          numero: { type: 'string', example: 'P-01' },
          niveau: { type: 'string', example: 'Sous-sol 1' },
          id_parking: { type: 'integer', example: 1 },
          est_visiteur: { type: 'boolean', example: false },
          est_occupee: { type: 'boolean', example: true },
        }
      },
      Mouvement: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 501 },
          heure_arrivee: { type: 'string', format: 'date-time', example: '2025-09-02T07:32:00Z' },
          heure_depart: { type: 'string', format: 'date-time', nullable: true, example: '2025-09-02T17:45:00Z' },
          statut: { type: 'string', enum: ['sur_site', 'hors_site'], example: 'hors_site' },
          type_entree: { type: 'string', enum: ['personnel', 'visiteur'], example: 'personnel' },
          id_parking: { type: 'integer', example: 1, nullable: true, description: 'Parking o├╣ le mouvement a eu lieu' },
          observation: { type: 'string', nullable: true, example: '' },
          vehicule: { $ref: '#/components/schemas/Vehicule' },
          agent: {
            type: 'object',
            nullable: true,
            properties: {
              utilisateur: { type: 'object', properties: { nom: { type: 'string' }, prenom: { type: 'string' } } }
            }
          }
        }
      },
      // ÔöÇÔöÇÔöÇ Requ├¬tes Registre ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      MouvementEntreeRequest: {
        type: 'object',
        required: ['type_entree'],
        description: '**Si type_entree = "personnel"** : fournir `matricule_personnel` OU `numero_plaque`.\n**Si type_entree = "visiteur"** : `numero_plaque` obligatoire.',
        properties: {
          type_entree: { type: 'string', example: 'personnel', description: 'Accepte les valeurs : "personnel", "visiteur", "P", "p", "V", "v" (insensible ├á la casse, le backend normalise)' },
          matricule_personnel: { type: 'string', example: 'EMP-001', description: 'Scann├® via QR Code' },
          numero_plaque: { type: 'string', example: 'RC-1234', description: 'Lu par la cam├®ra de plaque' },
          matricule_visite: { type: 'string', example: 'EMP-005', description: 'Optionnel ÔÇö Matricule du personnel chez qui le visiteur se rend' },
          observation: { type: 'string', example: '', description: 'Optionnel' },
        }
      },
      MouvementSortieRequest: {
        type: 'object',
        description: 'Fournir **au moins un** des trois identifiants pour retrouver le mouvement actif.',
        properties: {
          id_passage: { type: 'integer', example: 501, description: 'Cl├┤ture manuelle par ID du mouvement' },
          matricule_personnel: { type: 'string', example: 'EMP-001', description: 'Scann├® via QR Code' },
          numero_plaque: { type: 'string', example: 'RC-1234', description: 'Lu par la cam├®ra de plaque' },
          observation: { type: 'string', example: '', description: 'Optionnel' },
        }
      },
      MouvementCorrectionRequest: {
        type: 'object',
        description: 'Tous les champs sont optionnels (modification partielle). Les dates doivent ├¬tre au format ISO 8601.',
        properties: {
          heure_arrivee: { type: 'string', format: 'date-time', example: '2025-09-02T07:00:00Z', description: 'Format ISO 8601 requis' },
          heure_depart: { type: 'string', format: 'date-time', example: '2025-09-02T17:00:00Z', nullable: true, description: 'Format ISO 8601 requis' },
          statut: { type: 'string', enum: ['Present', 'Termine', 'Annule'], description: 'ÔÜá Valeurs sensibles ├á la casse' },
          observation: { type: 'string', example: 'Correction suite ├á une erreur de scan.' },
          id_vehicule: { type: 'integer', nullable: true, description: 'Optionnel ÔÇö Modifier le v├®hicule associ├®' },
          annuler: { type: 'boolean', description: 'Optionnel ÔÇö Marque le mouvement comme annul├®' },
        }
      },
      // ÔöÇÔöÇÔöÇ Requ├¬tes Admin ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      PersonnelCreateRequest: {
        type: 'object',
        required: ['nom', 'prenom', 'matricule'],
        description: 'Le personnel cr├®├® re├ºoit son matricule comme mot de passe par d├®faut (`doit_changer_mdp = true`). Fournir soit `fonction` (nom textuel) soit `id_fonction`.',
        properties: {
          nom: { type: 'string', minLength: 1, example: 'Diallo' },
          prenom: { type: 'string', minLength: 1, example: 'Fatoumata' },
          matricule: { type: 'string', minLength: 1, example: 'EMP-042' },
          fonction: { type: 'string', example: 'Directeur R├®gional', description: 'Nom de la fonction (cr├®├®e si inexistante)' },
          id_fonction: { type: 'integer', example: 3, description: 'ID de la fonction existante (alternatif ├á `fonction`)' },
          numero_plaque: { type: 'string', example: 'RC-4242', description: 'Optionnel' },
        }
      },
      PersonnelUpdateRequest: {
        type: 'object',
        description: 'Tous les champs sont optionnels (modification partielle). Les champs non fournis ne sont pas modifi├®s.',
        properties: {
          nom: { type: 'string' },
          prenom: { type: 'string' },
          matricule: { type: 'string' },
          id_fonction: { type: 'integer', description: 'ID de la nouvelle fonction ├á assigner' },
        }
      },
      UtilisateurCreateRequest: {
        type: 'object',
        required: ['nom', 'prenom', 'matricule', 'role'],
        description: 'L\'utilisateur cr├®├® re├ºoit son matricule comme mot de passe par d├®faut (`doit_changer_mdp = true`). ÔÜá Valeurs du r├┤le sensibles ├á la casse.',
        properties: {
          nom: { type: 'string', minLength: 1, example: 'Kamara' },
          prenom: { type: 'string', minLength: 1, example: 'Ibrahim' },
          matricule: { type: 'string', minLength: 1, example: 'AGT-010' },
          role: { type: 'string', enum: ['Agent', 'Supervision', 'Administrateur'], example: 'Agent', description: 'ÔÜá Valeurs sensibles ├á la casse : Agent, Supervision, Administrateur' },
          id_parking: { type: 'integer', example: 1, description: 'Optionnel. Assigner l\'agent ├á un parking sp├®cifique' },
        }
      },
      UtilisateurUpdateRequest: {
        type: 'object',
        description: 'Tous les champs sont optionnels. ÔÜá Valeurs du r├┤le sensibles ├á la casse. **Politique MDP :** Min. 12 caract├¿res, 1 majuscule, 1 chiffre, 1 caract├¿re sp├®cial.',
        properties: {
          nom: { type: 'string' },
          prenom: { type: 'string' },
          matricule: { type: 'string' },
          mot_de_passe: { type: 'string', minLength: 12, example: 'NouveauMdpS├®curis├®123!', description: 'Min 12 caract├¿res, 1 majuscule, 1 chiffre, 1 caract├¿re sp├®cial' },
          role: { type: 'string', enum: ['Agent', 'Supervision', 'Administrateur'], description: 'ÔÜá Valeurs sensibles ├á la casse' },
          id_parking: { type: 'integer', example: 1, description: 'Optionnel. Assigner l\'agent ├á un parking sp├®cifique' },
        }
      },
      AjoutVehiculeRequest: {
        type: 'object',
        required: ['numero_plaque'],
        properties: {
          numero_plaque: { type: 'string', minLength: 1, example: 'RC-9999', description: 'Obligatoire. Format libre (ex: RC-9999, GN-1234)' },
          marque: { type: 'string', example: 'Toyota', description: 'Optionnel' },
          couleur: { type: 'string', example: 'Noir', description: 'Optionnel' },
        }
      },
      FonctionCreateRequest: {
        type: 'object',
        required: ['nom_fonction', 'id_parking', 'niveau_parking', 'numero_place'],
        properties: {
          nom_fonction: { type: 'string', example: 'Gouverneur' },
          id_parking: { type: 'integer', example: 1 },
          niveau_parking: { type: 'string', example: 'Sous-sol 1' },
          numero_place: { type: 'string', example: 'P-01' },
        }
      },
      VisiteurCreateRequest: {
        type: 'object',
        required: ['id_parking', 'niveau_parking', 'numero_place'],
        properties: {
          id_parking: { type: 'integer', example: 1 },
          niveau_parking: { type: 'string', example: 'Sous-sol 1' },
          numero_place: { type: 'string', example: 'V-01' },
        }
      },
      Parking: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nom: { type: 'string', example: 'Parking Principal' },
          adresse: { type: 'string', nullable: true, example: 'Sous-sol BCRG' },
          nombre_niveaux: { type: 'integer', example: 2, description: '0 si parking sans niveau (ex: cour)' },
          capacite_maximale: { type: 'integer', example: 150, nullable: true },
          capacites_niveaux: { type: 'object', additionalProperties: { type: 'integer' }, example: { 'Niveau 1': 75, 'Niveau 2': 75 }, nullable: true },
          places: { type: 'array', items: { $ref: '#/components/schemas/PlaceParking' } }
        }
      },
      ParkingCreateRequest: {
        type: 'object',
        required: ['nom'],
        properties: {
          nom: { type: 'string', example: 'Parking Annexe' },
          adresse: { type: 'string', example: 'Avenue de la R├®publique' },
          nombre_niveaux: { type: 'integer', example: 0 },
          capacite_maximale: { type: 'integer', example: 50 },
          capacites_niveaux: { type: 'object', additionalProperties: { type: 'integer' }, example: { 'Niveau 1': 30, 'Niveau 2': 20 } }
        }
      },
      ParkingUpdateRequest: {
        type: 'object',
        properties: {
          nom: { type: 'string' },
          adresse: { type: 'string' },
          nombre_niveaux: { type: 'integer' },
          capacite_maximale: { type: 'integer' },
          capacites_niveaux: { type: 'object', additionalProperties: { type: 'integer' } }
        }
      },
      // ÔöÇÔöÇÔöÇ R├®ponses Dashboard ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
      DashboardStatsResponse: {
        type: 'object',
        properties: {
          kpis: {
            type: 'object',
            properties: {
              presents_sur_site: { type: 'integer', example: 47, description: 'Nombre de personnes actuellement sur site' },
              capacite_max: { type: 'integer', example: 200, description: 'Capacit├® max (d├®duite dynamiquement de la BDD)' },
              taux_occupation: { type: 'integer', example: 23, description: 'Taux d\'occupation en %' },
              entrees_jour: { type: 'integer', example: 89, description: 'Entr├®es sur la p├®riode filtr├®e' },
              sorties_jour: { type: 'integer', example: 74, description: 'Sorties sur la p├®riode filtr├®e' },
            }
          },
          flux_horaire: {
            type: 'array',
            description: 'Flux par tranche horaire (de 6h ├á 19h)',
            items: {
              type: 'object',
              properties: {
                heure: { type: 'string', example: '08:00' },
                entrees: { type: 'integer', example: 15 },
                sorties: { type: 'integer', example: 2 },
              }
            }
          },
          repartition_flotte: {
            type: 'object',
            properties: {
              personnel: { type: 'integer', example: 120 },
              visiteurs: { type: 'integer', example: 15 },
            }
          },
          trafic_jour: {
            type: 'object',
            properties: {
              personnel: { type: 'integer', example: 70 },
              visiteurs: { type: 'integer', example: 19 },
              total: { type: 'integer', example: 89 },
            }
          },
          trafic_mois: { type: 'integer', example: 1840, description: 'Total des entr├®es depuis le d├®but du mois' },
          derniers_mouvements: {
            type: 'array',
            description: '5 derniers mouvements enregistr├®s',
            items: { $ref: '#/components/schemas/Mouvement' },
          }
        }
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // AUTHENTIFICATION
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/auth/login': {
      post: {
        tags: ['Authentification'],
        summary: 'Connexion',
        description: 'Authentifie un utilisateur et retourne un token JWT valide 24h. Si `doit_changer_mdp = true` dans la r├®ponse, l\'utilisateur doit appeler `POST /api/auth/change-password` avant toute autre action.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'Connexion r├®ussie ÔÇö Retourne le token JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokenResponse' } } },
          },
          '400': { description: 'Donn├®es invalides (validation Zod)' },
          '401': { description: 'Matricule ou mot de passe incorrect' },
          '403': { description: 'Compte d├®sactiv├®' },
          '429': { description: 'Trop de tentatives ÔÇö Rate limited (10/15min)' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentification'],
        summary: 'Profil de l\'utilisateur connect├®',
        description: 'Retourne les informations compl├¿tes du compte connect├®, incluant son r├┤le, son profil personnel (si applicable) et ses v├®hicules.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profil complet',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserMeResponse' } } },
          },
          '401': { description: 'Token absent, invalide ou expir├®' },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Authentification'],
        summary: 'Changer le mot de passe',
        description: 'Obligatoire lors de la premi├¿re connexion (`doit_changer_mdp = true`). Met ├á jour le mot de passe et invalide la session courante (l\'utilisateur doit se reconnecter).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } },
        },
        responses: {
          '200': {
            description: 'Mot de passe mis ├á jour. Reconnexion requise.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Mot de passe mis ├á jour avec succ├¿s. Veuillez vous reconnecter avec votre nouveau mot de passe.' }
                  }
                }
              }
            }
          },
          '400': { description: 'Mot de passe ne respecte pas la politique de s├®curit├®' },
          '401': { description: 'Non authentifi├®' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // OP├ëRATIONNEL ÔÇö VIGILES (Agents)
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/registre/entree': {
      post: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Enregistrer une entr├®e',
        description: 'Cr├®e un nouveau mouvement d\'entr├®e dans le registre. Fournir `matricule_personnel` ou `numero_plaque` selon le type.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MouvementEntreeRequest' } } },
        },
        responses: {
          '201': {
            description: 'Entr├®e enregistr├®e',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Entr├®e enregistr├®e avec succ├¿s.' },
                    mouvement: { $ref: '#/components/schemas/Mouvement' },
                  }
                }
              }
            }
          },
          '400': { description: 'Donn├®es invalides ou parking plein' },
          '401': { description: 'Non authentifi├®' },
          '404': { description: 'Personnel ou v├®hicule introuvable' },
          '409': { description: 'Le v├®hicule/personnel est d├®j├á sur site' },
        },
      },
    },
    '/api/v1/registre/sortie': {
      put: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Enregistrer une sortie',
        description: 'Cl├┤ture un mouvement (passage de `sur_site` ├á `hors_site`). Fournir au moins l\'un des identifiants.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MouvementSortieRequest' } } },
        },
        responses: {
          '200': {
            description: 'Sortie enregistr├®e',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Sortie enregistr├®e avec succ├¿s.' },
                    mouvement: { $ref: '#/components/schemas/Mouvement' },
                  }
                }
              }
            }
          },
          '400': { description: 'Aucun identifiant fourni' },
          '404': { description: 'Aucun mouvement actif trouv├®' },
        },
      },
    },
    '/api/v1/registre/mouvement/personnel': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Mouvements du personnel',
        description: 'Retourne la liste pagin├®e des mouvements du personnel avec filtres par statut (sur_site / hors_site, tous par d├®faut) et par dates. R├®ponse au format `{ data, meta }`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2025-09-01T00:00:00Z' },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2025-09-01T23:59:59Z' },
          { in: 'query', name: 'statut', schema: { type: 'string', enum: ['sur_site', 'hors_site'] }, description: 'Optionnel. Filtrer par statut (sur_site / hors_site). Si omis, renvoie tous les mouvements.' },
          { in: 'query', name: 'id_parking', schema: { type: 'integer' }, description: 'Optionnel. Filtrer par parking' },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1, minimum: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Liste pagin├®e des mouvements du personnel',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Mouvement' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  }
                }
              }
            }
          },
        },
      },
    },
    '/api/v1/registre/mouvement/visiteur': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Mouvements des visiteurs',
        description: 'Retourne la liste pagin├®e des mouvements des visiteurs avec filtres par statut (sur_site / hors_site, tous par d├®faut) et par dates. R├®ponse au format `{ data, meta }`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2025-09-01T00:00:00Z' },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2025-09-01T23:59:59Z' },
          { in: 'query', name: 'statut', schema: { type: 'string', enum: ['sur_site', 'hors_site'] }, description: 'Optionnel. Filtrer par statut (sur_site / hors_site). Si omis, renvoie tous les mouvements.' },
          { in: 'query', name: 'id_parking', schema: { type: 'integer' }, description: 'Optionnel. Filtrer par parking' },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1, minimum: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Liste pagin├®e des mouvements des visiteurs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Mouvement' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  }
                }
              }
            }
          },
        },
      },
    },
    '/api/v1/personnel': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Rechercher un membre du personnel',
        description: 'Recherche par matricule ou nom. Au moins un param├¿tre est recommand├®.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'matricule', schema: { type: 'string' }, description: 'Matricule exact' },
          { in: 'query', name: 'nom', schema: { type: 'string' }, description: 'Recherche partielle sur le nom' },
          { in: 'query', name: 'statut', schema: { type: 'string', enum: ['actif', 'suspendu'] }, description: 'Filtrer par statut' },
        ],
        responses: {
          '200': {
            description: 'R├®sultat de la recherche',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Personnel' } } },
          },
          '404': { description: 'Personnel introuvable' },
        },
      },
    },
    '/api/v1/vehicules': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Rechercher un v├®hicule',
        description: 'Recherche un v├®hicule par num├®ro de plaque.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'plaque', schema: { type: 'string' }, description: 'Num├®ro de plaque (ex: RC-1234)' },
        ],
        responses: {
          '200': { description: 'V├®hicule trouv├®', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vehicule' } } } },
          '404': { description: 'V├®hicule introuvable' },
        },
      },
    },
    '/api/v1/vehicules/autorises': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Lister les v├®hicules autoris├®s',
        description: 'Retourne la liste de tous les v├®hicules du personnel enregistr├®s dans le syst├¿me.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste des v├®hicules autoris├®s',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicule' } } } },
          },
        },
      },
    },
    '/api/v1/parking/statut': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Statut du parking (taux de remplissage)',
        description: 'Retourne l\'├®tat actuel du parking : places occup├®es, capacit├® totale et taux d\'occupation.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Statut du parking',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    presents_sur_site: { type: 'integer', example: 47 },
                    capacite_max: { type: 'integer', example: 200 },
                    taux_occupation: { type: 'integer', example: 23, description: 'En pourcentage' },
                  }
                }
              }
            }
          },
        },
      },
    },
    '/api/v1/personnel/{matricule}/vehicules': {
      post: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'Ajouter un v├®hicule ├á un personnel',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' }, description: 'Matricule du personnel' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AjoutVehiculeRequest' } } },
        },
        responses: {
          '201': { description: 'V├®hicule ajout├® avec succ├¿s' },
          '404': { description: 'Personnel introuvable' },
          '409': { description: 'Ce num├®ro de plaque existe d├®j├á' },
        },
      },
    },
    '/api/v1/personnel/{matricule}/qrcode': {
      get: {
        tags: ['Op├®rationnel (Vigiles)'],
        summary: 'T├®l├®charger le QR Code d\'un personnel',
        description: 'Retourne directement l\'image PNG du QR Code du personnel.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Image PNG du QR Code',
            content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
          },
          '404': { description: 'Personnel introuvable' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // SUPERVISION
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/registre/correction/{id_passage}': {
      put: {
        tags: ['Supervision'],
        summary: 'Corriger manuellement un mouvement',
        description: 'Permet ├á un Supervision ou Administrateur de modifier les donn├®es d\'un mouvement enregistr├® par erreur. L\'action est trac├®e dans les AuditLogs.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id_passage', required: true, schema: { type: 'integer' }, description: 'ID du mouvement ├á corriger' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MouvementCorrectionRequest' } } },
        },
        responses: {
          '200': { description: 'Correction appliqu├®e avec succ├¿s' },
          '403': { description: 'R├┤le insuffisant' },
          '404': { description: 'Mouvement introuvable' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // ADMINISTRATION ÔÇö CRUD
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/admin/personnel': {
      post: {
        tags: ['Administration (CRUD)'],
        summary: 'Cr├®er un personnel',
        description: 'Cr├®e un membre du personnel et son compte utilisateur associ├®. Mot de passe par d├®faut = matricule.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonnelCreateRequest' } } },
        },
        responses: {
          '201': { description: 'Personnel cr├®├® avec succ├¿s' },
          '400': { description: 'Donn├®es invalides (validation Zod)' },
          '409': { description: 'Ce matricule existe d├®j├á' },
        },
      },
    },
    '/api/v1/admin/personnel/{matricule}': {
      put: {
        tags: ['Administration (CRUD)'],
        summary: 'Modifier un personnel',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonnelUpdateRequest' } } },
        },
        responses: {
          '200': { description: 'Personnel modifi├®' },
          '404': { description: 'Personnel introuvable' },
        },
      },
      delete: {
        tags: ['Administration (CRUD)'],
        summary: 'D├®sactiver un personnel (Soft Delete)',
        description: 'D├®sactive le compte (`est_actif = false`). L\'historique est conserv├®.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Personnel d├®sactiv├®' },
          '404': { description: 'Personnel introuvable' },
        },
      },
    },
    '/api/v1/admin/personnel/{matricule}/reinitialiser-mdp': {
      post: {
        tags: ['Administration (CRUD)'],
        summary: 'R├®initialiser le mot de passe d\'un membre du personnel',
        description: 'R├®initialise le mot de passe du personnel ├á la valeur par d├®faut (`BCrgP@rking@2026`) ou ├á la valeur fournie dans le body, et positionne `doit_changer_mdp: true` (changement obligatoire ├á la connexion suivante).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' }, description: 'Matricule du personnel' },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mot_de_passe: { type: 'string', example: 'BCrgP@rking@2026', description: 'Mot de passe optionnel. Par d├®faut: BCrgP@rking@2026' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Mot de passe r├®initialis├® avec succ├¿s',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetResponse' } } }
          },
          '404': { description: 'Personnel introuvable' }
        }
      }
    },
    '/api/v1/admin/personnel/stats': {
      get: {
        tags: ['Administration (CRUD)'],
        summary: 'Statistiques globales du personnel',
        description: 'Retourne les compteurs totaux exacts du personnel (total, direction & cadres, v├®hicules rattach├®s, comptes actifs).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Statistiques globales du personnel',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonnelStatsResponse' } } }
          }
        }
      }
    },

    '/api/v1/admin/utilisateurs': {
      get: {
        tags: ['Administration (CRUD)'],
        summary: 'Lister tous les utilisateurs syst├¿me',
        description: 'Retourne Agents, Supervisions et Administrateurs. Mot de passe **exclu** de la r├®ponse.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'statut', schema: { type: 'string', enum: ['actif', 'suspendu'] }, description: 'Filtrer par statut' },
        ],
        responses: {
          '200': {
            description: 'Liste compl├¿te',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserMeResponse' } } } },
          },
        },
      },
      post: {
        tags: ['Administration (CRUD)'],
        summary: 'Cr├®er un utilisateur syst├¿me',
        description: 'Cr├®e un Agent, Supervision ou Admin. Mot de passe par d├®faut = matricule.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UtilisateurCreateRequest' } } },
        },
        responses: {
          '201': { description: 'Utilisateur cr├®├®' },
          '409': { description: 'Ce matricule existe d├®j├á' },
        },
      },
    },
    '/api/v1/admin/utilisateurs/{matricule}': {
      put: {
        tags: ['Administration (CRUD)'],
        summary: 'Modifier un utilisateur syst├¿me',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UtilisateurUpdateRequest' } } },
        },
        responses: {
          '200': { description: 'Modifi├® avec succ├¿s' },
          '400': { description: 'Mot de passe ne respecte pas la politique de s├®curit├®' },
          '404': { description: 'Utilisateur introuvable' },
        },
      },
      delete: {
        tags: ['Administration (CRUD)'],
        summary: 'D├®sactiver un utilisateur syst├¿me (Soft Delete)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'D├®sactiv├® avec succ├¿s' },
          '404': { description: 'Utilisateur introuvable' },
        },
      },
    },
    '/api/v1/admin/utilisateurs/{matricule}/reactiver': {
      put: {
        tags: ['Administration (CRUD)'],
        summary: 'R├®activer un utilisateur syst├¿me',
        description: 'R├®active un compte agent/supervision/admin d├®sactiv├®.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'R├®activ├® avec succ├¿s' },
          '404': { description: 'Utilisateur introuvable' },
        },
      },
    },
    '/api/v1/admin/utilisateurs/{matricule}/reinitialiser-mdp': {
      post: {
        tags: ['Administration (CRUD)'],
        summary: 'R├®initialiser le mot de passe d\'un utilisateur syst├¿me',
        description: 'R├®initialise le mot de passe de l\'utilisateur syst├¿me ├á la valeur par d├®faut (`BCrgP@rking@2026`) ou ├á la valeur fournie dans le body, et positionne `doit_changer_mdp: true` (changement obligatoire ├á la connexion suivante).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'matricule', required: true, schema: { type: 'string' }, description: 'Matricule de l\'utilisateur syst├¿me' },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mot_de_passe: { type: 'string', example: 'BCrgP@rking@2026', description: 'Mot de passe optionnel. Par d├®faut: BCrgP@rking@2026' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Mot de passe r├®initialis├® avec succ├¿s',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetResponse' } } }
          },
          '404': { description: 'Utilisateur introuvable' }
        }
      }
    },
    '/api/v1/admin/utilisateurs/stats': {
      get: {
        tags: ['Administration (CRUD)'],
        summary: 'Statistiques des utilisateurs',
        description: 'Retourne le nombre d\'utilisateurs par r├┤le et le nombre de comptes actifs/inactifs.',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Statistiques des comptes' } },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // ADMINISTRATION ÔÇö PARKING & FONCTIONS
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/admin/parkings': {
      get: {
        tags: ['Administration (Parking)'],
        summary: 'Lister tous les parkings',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste des parkings',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Parking' } } } },
          },
        },
      },
      post: {
        tags: ['Administration (Parking)'],
        summary: 'Cr├®er un parking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ParkingCreateRequest' } } },
        },
        responses: { '201': { description: 'Parking cr├®├®' }, '409': { description: 'Ce nom existe d├®j├á' } },
      },
    },
    '/api/v1/admin/parkings/{id_parking}': {
      put: {
        tags: ['Administration (Parking)'],
        summary: 'Modifier un parking',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id_parking', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ParkingUpdateRequest' } } },
        },
        responses: { '200': { description: 'Parking modifi├®' }, '404': { description: 'Introuvable' } },
      },
      delete: {
        tags: ['Administration (Parking)'],
        summary: 'Supprimer un parking',
        description: 'Impossible si des places y sont encore rattach├®es.',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id_parking', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Parking supprim├®' }, '400': { description: 'Des places y sont rattach├®es' }, '404': { description: 'Introuvable' } },
      },
    },
    '/api/v1/admin/fonctions': {
      get: {
        tags: ['Administration (Parking)'],
        summary: 'Lister les fonctions et leurs places',
        description: 'Retourne la liste des fonctions. Peut ├¬tre filtr├®e par id_parking.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'id_parking', schema: { type: 'integer' }, description: 'Filtrer par parking' },
        ],
        responses: {
          '200': {
            description: 'Liste des fonctions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      nom: { type: 'string', example: 'Gouverneur' },
                      places_parking: { type: 'array', items: { $ref: '#/components/schemas/PlaceParking' } },
                    }
                  }
                }
              }
            }
          },
        },
      },
      post: {
        tags: ['Administration (Parking)'],
        summary: 'Cr├®er une fonction et sa place de parking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FonctionCreateRequest' } } },
        },
        responses: {
          '201': { description: 'Fonction et place cr├®├®es' },
          '409': { description: 'Ce num├®ro de place est d├®j├á pris' },
        },
      },
    },
    '/api/v1/admin/fonctions/{id_fonction}': {
      delete: {
        tags: ['Administration (Parking)'],
        summary: 'Supprimer une fonction',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id_fonction', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Fonction supprim├®e' },
          '404': { description: 'Fonction introuvable' },
        },
      },
    },
    '/api/v1/admin/parking/places': {
      get: {
        tags: ['Administration (Parking)'],
        summary: 'Lister toutes les places de parking',
        description: 'Retourne la liste des places de parking. Peut ├¬tre filtr├®e par id_parking.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'id_parking', schema: { type: 'integer' }, description: 'Filtrer par parking' },
        ],
        responses: {
          '200': {
            description: 'Liste des places',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PlaceParking' } } } },
          },
        },
      },
    },
    '/api/v1/admin/parking/visiteurs': {
      post: {
        tags: ['Administration (Parking)'],
        summary: 'Ajouter une place pour visiteur',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VisiteurCreateRequest' } } },
        },
        responses: { '201': { description: 'Place visiteur cr├®├®e' } },
      },
    },
    '/api/v1/admin/parking/visiteurs/{id_place}': {
      delete: {
        tags: ['Administration (Parking)'],
        summary: 'Supprimer une place visiteur',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id_place', required: true, schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Place supprim├®e' } },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // ADMINISTRATION ÔÇö RAPPORTS & STATISTIQUES
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/admin/statistiques': {
      get: {
        tags: ['Administration (Rapports)'],
        summary: 'Tableau de bord ÔÇö KPIs et statistiques',
        description: 'Retourne tous les indicateurs cl├®s du tableau de bord. Par d├®faut, filtre sur la journ├®e courante.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2025-09-01T00:00:00Z' },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2025-09-01T23:59:59Z' },
          { in: 'query', name: 'id_parking', schema: { type: 'integer' }, description: 'Filtrer par parking' },
        ],
        responses: {
          '200': {
            description: 'Donn├®es du tableau de bord',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardStatsResponse' } } },
          },
        },
      },
    },
    '/api/v1/admin/historique': {
      get: {
        tags: ['Administration (Rapports)'],
        summary: 'Historique pagin├® des passages',
        description: 'Retourne l\'historique complet des mouvements avec filtres et pagination. R├®ponse au format `{ data, meta }`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' }, description: 'Filtrer ├á partir de cette date' },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' }, description: 'Filtrer jusqu\'├á cette date' },
          { in: 'query', name: 'type_entree', schema: { type: 'string', enum: ['personnel', 'visiteur'] }, description: 'Filtrer par type' },
          { in: 'query', name: 'id_parking', schema: { type: 'integer' }, description: 'Filtrer par parking' },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1, minimum: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Historique pagin├®',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Mouvement' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  }
                }
              }
            }
          },
        },
      },
    },
    '/api/v1/admin/rapports': {
      get: {
        tags: ['Administration (Rapports)'],
        summary: 'Exporter un rapport (CSV ou PDF)',
        description: 'G├®n├¿re et t├®l├®charge un fichier rapport de l\'historique.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'format', required: true, schema: { type: 'string', enum: ['csv', 'pdf'] } },
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': { description: 'Fichier t├®l├®charg├® (CSV ou PDF)' },
        },
      },
    },
    '/api/v1/admin/personnel/qrcodes': {
      get: {
        tags: ['Administration (Rapports)'],
        summary: 'Exporter tous les QR Codes',
        description: 'G├®n├¿re et t├®l├®charge les QR Codes du personnel. Le format peut ├¬tre ZIP (dossier compress├®), PDF ou JSON.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'format', schema: { type: 'string', enum: ['json', 'pdf', 'zip'], default: 'zip' }, description: 'Format d\'export' },
        ],
        responses: {
          '200': { description: 'Fichier export├® avec succ├¿s' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // ADMINISTRATION ÔÇö S├ëCURIT├ë & AUDIT
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/admin/audit-logs': {
      get: {
        tags: ['Administration (S├®curit├®)'],
        summary: 'Journal d\'audit',
        description: 'Retourne toutes les actions critiques r├®alis├®es dans le syst├¿me (cr├®ations, corrections, suppressions). Accessible uniquement aux Administrateurs.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Journal d\'audit',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          action: { type: 'string', example: 'CREATE_UTILISATEUR' },
                          cible: { type: 'string', example: 'AGT-010' },
                          details: { type: 'string' },
                          date_action: { type: 'string', format: 'date-time' },
                          utilisateur: { type: 'object', properties: { matricule: { type: 'string' }, nom: { type: 'string' } } },
                        }
                      }
                    },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  }
                }
              }
            }
          },
          '403': { description: 'R├┤le insuffisant (Administrateur requis)' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // ADMINISTRATION ÔÇö IMPORT MASSIF (CSV)
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/imports/personnel': {
      post: {
        tags: ['Administration (Import CSV)'],
        summary: 'Import massif du Personnel (CSV)',
        description: 'Importe plusieurs membres du personnel depuis un fichier CSV. Chaque personnel re├ºoit son matricule comme mot de passe par d├®faut.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'Fichier CSV' } } },
            },
          },
        },
        responses: {
          '200': { description: 'Import r├®ussi ÔÇö Retourne le nombre d\'entr├®es cr├®├®es et les ├®ventuelles erreurs de ligne' },
          '400': { description: 'Format de fichier invalide' },
        },
      },
    },
    '/api/v1/imports/utilisateurs': {
      post: {
        tags: ['Administration (Import CSV)'],
        summary: 'Import massif des Utilisateurs syst├¿me (CSV)',
        description: 'Importe plusieurs Agents/Supervisions depuis un fichier CSV.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
            },
          },
        },
        responses: {
          '200': { description: 'Import r├®ussi' },
          '400': { description: 'Format de fichier invalide' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // MON ESPACE (Personnel)
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/mon-espace/profil': {
      get: {
        tags: ['Mon Espace (Personnel)'],
        summary: 'Mon Profil',
        description: 'Retourne le profil complet du personnel connect├® : informations personnelles, fonction, v├®hicules enregistr├®s.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profil personnel',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Personnel' } } },
          },
          '403': { description: 'Acc├¿s refus├® (r├┤le Personnel requis)' },
          '404': { description: 'Profil introuvable' },
        },
      },
    },
    '/api/v1/mon-espace/qrcode': {
      get: {
        tags: ['Mon Espace (Personnel)'],
        summary: 'Mon QR Code',
        description: 'Retourne l\'image base64 du QR Code personnel, utilis├® pour le scan ├á l\'entr├®e/sortie.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'QR Code en base64',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { qr_code: { type: 'string', description: 'Image encod├®e en base64' } }
                }
              }
            }
          },
          '403': { description: 'Acc├¿s refus├®' },
          '404': { description: 'QR Code non g├®n├®r├®' },
        },
      },
    },
    '/api/v1/mon-espace/historique': {
      get: {
        tags: ['Mon Espace (Personnel)'],
        summary: 'Mon Historique de passages',
        description: 'Retourne l\'historique personnel pagin├® de tous ses passages dans le parking. R├®ponse au format `{ data, meta }`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date_debut', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'date_fin', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Historique pagin├®',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Mouvement' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  }
                }
              }
            }
          },
          '403': { description: 'Acc├¿s refus├®' },
        },
      },
    },
    '/api/v1/mon-espace/statut': {
      get: {
        tags: ['Mon Espace (Personnel)'],
        summary: 'Mon Statut de pr├®sence (temps r├®el)',
        description: 'Indique si le personnel connect├® est actuellement sur site ou non.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Statut de pr├®sence',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sur_site: { type: 'boolean', example: true },
                    dernier_mouvement: { $ref: '#/components/schemas/Mouvement' },
                  }
                }
              }
            }
          },
          '403': { description: 'Acc├¿s refus├®' },
        },
      },
    },
    '/api/v1/mon-espace/vehicules': {
      get: {
        tags: ['Mon Espace (Personnel)'],
        summary: 'Mes V├®hicules',
        description: 'Liste les v├®hicules enregistr├®s sur le profil du personnel connect├®.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste de mes v├®hicules',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicule' } } } },
          },
          '403': { description: 'Acc├¿s refus├®' },
        },
      },
    },
    '/api/v1/mon-espace/place': {
      get: {
        tags: ['Mon Espace (Personnel)'],
        summary: 'Ma Place de parking',
        description: 'Retourne les d├®tails de la place de parking r├®serv├®e selon la fonction du personnel connect├®.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Ma place de parking',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PlaceParking' } } },
          },
          '403': { description: 'Acc├¿s refus├®' },
          '404': { description: 'Aucune place assign├®e ├á votre fonction' },
        },
      },
    },
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    // FLOTTE (Admin/Supervision)
    // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
    '/api/v1/admin/vehicules': {
      get: {
        tags: ['Administration (Rapports)'],
        summary: 'Lister toute la flotte de v├®hicules',
        description: 'Retourne tous les v├®hicules enregistr├®s dans le syst├¿me avec leurs propri├®taires.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Flotte compl├¿te',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicule' } } } },
          },
        },
      },
    },
    '/api/v1/admin/vehicules/stats': {
      get: {
        tags: ['Administration (Rapports)'],
        summary: 'Statistiques de la flotte',
        description: 'Retourne le nombre de v├®hicules par type (personnel vs visiteur).',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Stats de la flotte' } },
      },
    },
  },
};
