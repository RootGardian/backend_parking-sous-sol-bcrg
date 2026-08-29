export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Parking BCRG',
    version: '1.0.0',
    description: 'Documentation officielle de l\'API pour la gestion du Parking de la BCRG.',
  },
  servers: [
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
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'Authentification',
        tags: ['Authentification'],
        security: [], // No auth required for login
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  matricule: { type: 'string', example: 'ADM-001' },
                  mot_de_passe: { type: 'string', example: 'admin123' },
                },
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
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/personnel/matricule/{matricule}': {
      get: {
        summary: 'Rechercher un membre du personnel par matricule',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          {
            in: 'path',
            name: 'matricule',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Succès' },
          '404': { description: 'Personnel introuvable' },
        },
      },
    },
    '/api/v1/personnel/recherche': {
      get: {
        summary: 'Rechercher un membre du personnel par nom',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'q', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/personnel/{id_personne}/vehicules': {
      post: {
        summary: 'Ajouter un véhicule à un membre du personnel',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'path', name: 'id_personne', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  numero_plaque: { type: 'string', example: 'RC-9999' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Véhicule ajouté' },
        },
      },
    },
    '/api/v1/vehicules/recherche': {
      get: {
        summary: 'Rechercher un véhicule par plaque',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          { in: 'query', name: 'plaque', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/entree': {
      post: {
        summary: 'Enregistrer une entrée',
        tags: ['Opérationnel (Vigiles)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type_entree: { type: 'string', enum: ['personnel', 'visiteur'], example: 'personnel' },
                  matricule_personnel: { type: 'string', example: 'EMP-001' },
                  numero_plaque: { type: 'string', example: 'RC-1234' },
                  observation: { type: 'string', example: 'Rien à signaler' },
                  matricule_visite: { type: 'string', description: 'Obligatoire si type=visiteur' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Entrée enregistrée avec succès' },
        },
      },
    },
    '/api/v1/registre/sortie/{id_passage}': {
      put: {
        summary: 'Enregistrer une sortie',
        tags: ['Opérationnel (Vigiles)'],
        parameters: [
          {
            in: 'path',
            name: 'id_passage',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': { description: 'Sortie enregistrée' },
        },
      },
    },
    '/api/v1/registre/personnel-sur-site': {
      get: {
        summary: 'Lister le personnel actuellement sur site',
        tags: ['Opérationnel (Vigiles)'],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/visiteurs-sur-site': {
      get: {
        summary: 'Lister les visiteurs actuellement sur site',
        tags: ['Opérationnel (Vigiles)'],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/vehicules-autorises': {
      get: {
        summary: 'Lister les véhicules autorisés',
        tags: ['Opérationnel (Vigiles)'],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/gouverneurs': {
      get: {
        summary: 'Lister les véhicules des Gouverneurs (Places Réservées)',
        tags: ['Opérationnel (Vigiles)'],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/parking/statut': {
      get: {
        summary: 'Connaître le taux de remplissage du parking et des quotas VIP',
        tags: ['Opérationnel (Vigiles)'],
        responses: {
          '200': { description: 'Succès' },
        },
      },
    },
    '/api/v1/registre/correction/{id_passage}': {
      put: {
        summary: 'Corriger manuellement un mouvement (Superviseur/Admin)',
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
                type: 'object',
                properties: {
                  heure_arrivee: { type: 'string', format: 'date-time' },
                  heure_depart: { type: 'string', format: 'date-time' },
                  statut: { type: 'string', enum: ['sur_site', 'hors_site'] },
                  observation: { type: 'string' },
                },
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
        tags: ['Administration (CRUD)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  prenom: { type: 'string' },
                  matricule: { type: 'string', example: 'EMP-001' },
                  fonction: { type: 'string', example: 'Directeur' },
                  numero_plaque: { type: 'string' },
                },
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
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  prenom: { type: 'string' },
                  matricule: { type: 'string' },
                  fonction: { type: 'string' },
                },
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
        summary: 'Ajouter manuellement un Agent/Superviseur',
        tags: ['Administration (CRUD)'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  prenom: { type: 'string' },
                  matricule: { type: 'string' },
                  mot_de_passe: { type: 'string' },
                  role: { type: 'string', enum: ['agent', 'superviseur', 'admin'] },
                },
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
        summary: 'Modifier un Agent/Superviseur',
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
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  prenom: { type: 'string' },
                  matricule: { type: 'string' },
                  mot_de_passe: { type: 'string' },
                  role: { type: 'string' },
                },
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
        tags: ['Administration (Rapports)'],
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
