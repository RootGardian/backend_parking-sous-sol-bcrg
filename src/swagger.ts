export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Parking BCRG',
    version: '1.0.0',
    description: 'Documentation officielle de l\'API pour la gestion du Parking de la BCRG.',
  },
  servers: [
    {
      url: 'https://backend-parking-sous-sol-bcrg.onrender.com',
      description: 'Serveur de Production (Render)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Serveur de Développement',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      UserMeResponse: {
        type: 'object',
        properties: {
          utilisateur: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              nom: { type: 'string', example: 'Doe' },
              prenom: { type: 'string', example: 'John' },
              matricule: { type: 'string', example: 'ADM-001' },
              role: { type: 'array', items: { type: 'string' }, example: ['admin'] },
              est_actif: { type: 'boolean', example: true },
              personnel: {
                type: 'object',
                properties: {
                  id: { type: 'integer', example: 1 },
                  id_fonction: { type: 'integer', example: 2 },
                  fonction: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 2 },
                      nom: { type: 'string', example: 'Gouverneur' }
                    }
                  },
                  vehicules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 1 },
                        numero_plaque: { type: 'string', example: 'RC-1234' }
                      }
                    }
                  }
                }
              },
              agent: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'integer', example: 1 }
                }
              }
            }
          }
        }
      },

      Error: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          message: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        description: "**Champs obligatoires :**\n- `matricule`\n- `mot_de_passe`",
        required: ['matricule', 'mot_de_passe'],
        properties: {
          matricule: { type: 'string', example: 'ADM-001' },
          mot_de_passe: { type: 'string', example: 'admin123' }
        }
      },
      AuthTokenResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Connexion réussie.' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          profil: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              nom: { type: 'string' },
              prenom: { type: 'string' },
              matricule: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      },
      Personnel: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          departement: { type: 'string' },
          fonction: { type: 'array', items: { type: 'string' } },
          id_utilisateur: { type: 'integer' }
        }
      },
      Vehicule: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          numero_plaque: { type: 'string' },
          id_personnel: { type: 'integer' }
        }
      },
      MouvementEntreeRequest: {
        type: 'object',
        description: "**Champs obligatoires :**\n- `type_entree` (personnel ou visiteur)\n- `matricule_personnel` OU `numero_plaque` (si personnel)\n- `numero_plaque` (si visiteur)\n\n**Optionnel :**\n- `observation`",
        required: ['type_entree'],
        properties: {
          type_entree: { type: 'string', enum: ['personnel', 'visiteur'], example: 'personnel' },
          matricule_personnel: { type: 'string', example: 'EMP-001' },
          numero_plaque: { type: 'string', example: 'RC-1234' },
          observation: { type: 'string', example: '' }
        }
      },
      MouvementSortieRequest: {
        type: 'object',
        description: "**Champs obligatoires (au moins un identifiant) :**\n- `id_passage`\n- OU `matricule_personnel`\n- OU `numero_plaque`\n\n**Optionnel :**\n- `observation`",
        properties: {
          id_passage: { type: 'integer', description: 'Optionnel. L\'ID du mouvement à clôturer manuellement' },
          matricule_personnel: { type: 'string', example: 'EMP-001', description: 'Le matricule scanné via QR code' },
          numero_plaque: { type: 'string', example: 'RC-1234', description: 'Le numéro de plaque lu' },
          observation: { type: 'string', example: '' },
        }
      },
      MouvementCorrectionRequest: {
        type: 'object',
        description: "**Tous les champs sont optionnels** (modification partielle).",
        properties: {
          heure_arrivee: { type: 'string', format: 'date-time' },
          heure_depart: { type: 'string', format: 'date-time' },
          statut: { type: 'string', enum: ['sur_site', 'hors_site'] },
          observation: { type: 'string' },
        }
      },
      PersonnelCreateRequest: {
        type: 'object',
        description: "**Champs obligatoires :**\n- `nom`\n- `prenom`\n- `matricule`\n- `fonction`\n\n**Optionnel :**\n- `numero_plaque`",
        required: ['nom', 'prenom', 'matricule', 'fonction'],
        properties: {
          nom: { type: 'string' },
          prenom: { type: 'string' },
          matricule: { type: 'string', example: 'EMP-001' },
          fonction: { type: 'string', example: 'Directeur' },
          numero_plaque: { type: 'string' },
        }
      },
      PersonnelUpdateRequest: {
        type: 'object',
        description: "**Tous les champs sont optionnels** (renseignez uniquement ce qui doit changer).",
        properties: {
          nom: { type: 'string' },
          prenom: { type: 'string' },
          matricule: { type: 'string' },
          fonction: { type: 'string' },
        }
      },
      UtilisateurCreateRequest: {
        type: 'object',
        description: "**Champs obligatoires :**\n- `nom`\n- `prenom`\n- `matricule`\n- `mot_de_passe`\n- `role`",
        required: ['nom', 'prenom', 'matricule', 'mot_de_passe', 'role'],
        properties: {
          nom: { type: 'string' },
          prenom: { type: 'string' },
          matricule: { type: 'string' },
          mot_de_passe: { type: 'string' },
          role: { type: 'string', enum: ['agent', 'superviseur', 'admin'] },
        }
      },
      UtilisateurUpdateRequest: {
        type: 'object',
        description: "**Tous les champs sont optionnels** (renseignez uniquement ce qui doit changer).",
        properties: {
          nom: { type: 'string' },
          prenom: { type: 'string' },
          matricule: { type: 'string' },
          mot_de_passe: { type: 'string' },
          role: { type: 'string' },
        }
      },
      AjoutVehiculeRequest: {
        type: 'object',
        description: "**Champs obligatoires :**\n- `numero_plaque`",
        required: ['numero_plaque'],
        properties: {
          numero_plaque: { type: 'string', example: 'RC-9999' },
        }
      }
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/me': {
      get: {
        summary: 'Obtenir les informations de l\'utilisateur connecté',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir le format exact de la réponse. Nécessite un Bearer Token valide.',
        tags: ['Authentification'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Succès - Retourne le profil complet avec fonction et véhicules',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserMeResponse'
                }
              }
            }
          },
          '401': {
            description: 'Non authentifié ou Token expiré'
          }
        }
      }
    },

    '/api/auth/login': {
      post: {
        summary: 'Authentification',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Authentification'],
        security: [], // No auth required for login
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest'
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Succès - Retourne le token JWT',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthTokenResponse'
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/personnel': {
      get: {
        summary: 'Rechercher un membre du personnel',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'matricule', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'nom', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Succès' },
          '404': { description: 'Personnel introuvable' },
        },
      },
    },
    '/api/v1/personnel/{id_personne}/vehicules': {
      post: {
        summary: 'Ajouter un véhicule à un membre du personnel',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'path', name: 'id_personne', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AjoutVehiculeRequest'
              },
            },
          },
        },
        responses: {
          '201': { description: 'Véhicule ajouté' },
        },
      },
    },
    '/api/v1/vehicules': {
      get: {
        summary: 'Lister ou rechercher un véhicule',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'plaque', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/entree': {
      post: {
        summary: 'Enregistrer une entrée',
        description: `
**Champs obligatoires :**
- \`type_entree\` ("personnel" ou "visiteur")

**Si le type est "personnel" :**
- Vous devez fournir **soit** le \`matricule_personnel\` **soit** le \`numero_plaque\` (ou les deux).

**Si le type est "visiteur" :**
- Vous devez **obligatoirement** fournir le \`numero_plaque\`.

**Champs toujours optionnels :**
- \`observation\` (peut être laissé vide)
`,
        tags: ['Opérationnel (Vigiles)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MouvementEntreeRequest'
              },
            },
          },
        },
        responses: {
          '201': { description: 'Entrée enregistrée avec succès' },
        },
      },

    },
    '/api/v1/registre/sortie': {
      put: {
        summary: 'Enregistrer une sortie (par scan QR code ou Plaque)',
        description: `
**Champs obligatoires :**
Vous devez fournir **au moins l'un** de ces trois identifiants pour trouver le mouvement :
- \`numero_plaque\` (lors d'un scan de plaque)
- **OU** \`matricule_personnel\` (lors d'un scan de badge QR)
- **OU** \`id_passage\` (fermeture manuelle)

**Champs toujours optionnels :**
- \`observation\` (peut être laissé vide)
`,
        tags: ['Opérationnel (Vigiles)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MouvementSortieRequest'
              },
            },
          },
        },
        responses: {
          '200': { description: 'Sortie enregistrée' },
          '404': { description: 'Mouvement introuvable ou déjà hors site' },
        },
      },
    },
    '/api/v1/registre/sur-site': {
      get: {
        summary: 'Lister les personnes actuellement sur site',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'type', required: false, schema: { type: 'string', enum: ['personnel', 'visiteur'] } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/vehicules/autorises': {
      get: {
        summary: 'Lister les véhicules autorisés',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'type', required: false, schema: { type: 'string', enum: ['standard', 'gouverneur'] } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/parking/statut': {
      get: {
        summary: 'Connaître le taux de remplissage du parking et des quotas VIP',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2023-01-01T00:00:00Z' },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2023-12-31T23:59:59Z' },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/correction/{id_passage}': {
      put: {
        summary: 'Corriger manuellement un mouvement (Superviseur/Admin)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Supervision'],
        parameters: [
          {
            in: 'path',
            name: 'id_passage',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MouvementCorrectionRequest'
              },
            },
          },
        },
        responses: {
          '200': { description: 'Correction appliquée' },
        },
      },
    },
    '/api/v1/admin/personnel': {
      post: {
        summary: 'Ajouter manuellement un Personnel',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (CRUD)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PersonnelCreateRequest'
              },
            },
          },
        },
        responses: {
          '201': { description: 'Personnel créé' },
        },
      },
    },
    '/api/v1/admin/personnel/{matricule}': {
      put: {
        summary: 'Modifier un membre du Personnel',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (CRUD)'],
        parameters: [
          {
            in: 'path',
            name: 'matricule',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PersonnelUpdateRequest'
              },
            },
          },
        },
        responses: {
          '200': { description: 'Modifié avec succès' },
        },
      },
      delete: {
        summary: 'Supprimer un membre du Personnel (Soft Delete)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (CRUD)'],
        parameters: [
          {
            in: 'path',
            name: 'matricule',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Désactivé avec succès' },
        },
      },
    },
    '/api/v1/admin/utilisateurs': {
      post: {
        summary: 'Ajouter manuellement un Utilisateur (Agent, Superviseur, Admin)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (CRUD)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UtilisateurCreateRequest'
              },
            },
          },
        },
        responses: {
          '201': { description: 'Utilisateur créé' },
        },
      },
    },
    '/api/v1/admin/utilisateurs/{matricule}': {
      put: {
        summary: 'Modifier un Utilisateur (Agent, Superviseur, Admin)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (CRUD)'],
        parameters: [
          {
            in: 'path',
            name: 'matricule',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UtilisateurUpdateRequest'
              },
            },
          },
        },
        responses: {
          '200': { description: 'Modifié avec succès' },
        },
      },
      delete: {
        summary: 'Supprimer un Agent/Superviseur (Soft Delete)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (CRUD)'],
        parameters: [
          {
            in: 'path',
            name: 'matricule',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Désactivé avec succès' },
        },
      },
    },
    '/api/v1/imports/personnel': {
      post: {
        summary: 'Import massif du Personnel (CSV)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (Massif)'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Import réussi' },
        },
      },
    },
    '/api/v1/imports/utilisateurs': {
      post: {
        summary: 'Import massif des Utilisateurs système (CSV)',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (Massif)'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Import réussi' },
        },
      },
    },
    '/api/v1/admin/personnel/qrcodes': {
      get: {
        summary: 'Exporter tous les QR Codes',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (Rapports)'],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/admin/historique': {
      get: {
        summary: 'Consulter l\'historique des passages',
        tags: ['Administration (Rapports)'],
        parameters: [
          { in: 'query', name: 'dateDebut', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'dateFin', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'typeEntree', schema: { type: 'string', enum: ['personnel', 'visiteur'] } },
          { in: 'query', name: 'recherche', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/admin/audit-logs': {
      get: {
        summary: 'Consulter le journal d\'audit de sécurité',
        tags: ['Administration (Sécurité)'],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/admin/statistiques': {
      get: {
        summary: 'Indicateurs clés du tableau de bord',
        description: '**Note :** Veuillez vous référer à la section Modèles (Schemas) en bas de page pour voir les champs obligatoires et optionnels.',
        tags: ['Administration (Rapports)'],
        parameters: [
          { in: 'query', name: 'date_debut', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2023-01-01T00:00:00Z' },
          { in: 'query', name: 'date_fin', schema: { type: 'string', format: 'date-time' }, description: 'Ex: 2023-12-31T23:59:59Z' },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/admin/rapports': {
      get: {
        summary: 'Exporter le rapport d\'audit (CSV ou PDF)',
        tags: ['Administration (Rapports)'],
        parameters: [
          { in: 'query', name: 'format', required: true, schema: { type: 'string', enum: ['csv', 'pdf'] } },
          { in: 'query', name: 'dateDebut', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'dateFin', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': { description: 'Fichier téléchargé' },
        },
      },
    },
  },
};
