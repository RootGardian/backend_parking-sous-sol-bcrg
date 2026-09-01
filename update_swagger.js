const fs = require('fs');

const tsCode = fs.readFileSync('src/swagger.ts', 'utf8');

// The file exports swaggerDocument using "export const swaggerDocument = { ... };"
// We'll replace it.

let newCode = tsCode;

if (!newCode.includes("doit_changer_mdp: { type: 'boolean', example: true }")) {
  newCode = newCode.replace(
    "est_actif: { type: 'boolean', example: true },",
    "est_actif: { type: 'boolean', example: true },\\n              doit_changer_mdp: { type: 'boolean', example: true },"
  );
}

if (!newCode.includes('/api/v1/auth/change-password')) {
  const changePasswordBlock = `
    '/api/v1/auth/change-password': {
      post: {
        tags: ['Authentification'],
        summary: 'Changer le mot de passe',
        description: 'Permet à un utilisateur de changer son mot de passe, particulièrement s\\'il y est forcé (doit_changer_mdp = true).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nouveau_mot_de_passe: { type: 'string', example: 'NouveauMdpSécurisé123' }
                },
                required: ['nouveau_mot_de_passe']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Mot de passe mis à jour avec succès.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter avec votre nouveau mot de passe.' }
                  }
                }
              }
            }
          },
          400: { description: 'Requête invalide.' },
          401: { description: 'Non authentifié.' }
        }
      }
    },`;

  newCode = newCode.replace('paths: {', 'paths: {' + changePasswordBlock);
}

if (!newCode.includes('/api/v1/personnel/{matricule}/qrcode')) {
  const qrcodeBlock = `
    '/api/v1/personnel/{matricule}/qrcode': {
      get: {
        tags: ['Terrain (Personnel & Véhicules)'],
        summary: 'Télécharger le QR Code d\\'un personnel',
        description: 'Retourne directement l\\'image PNG du QR code généré pour un membre du personnel.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'matricule',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Le matricule du membre du personnel'
          }
        ],
        responses: {
          200: {
            description: 'Image PNG du QR code',
            content: {
              'image/png': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          404: { description: 'Personnel introuvable.' }
        }
      }
    },`;

  newCode = newCode.replace('paths: {', 'paths: {' + qrcodeBlock);
}

fs.writeFileSync('src/swagger.ts', newCode);
console.log('Done!');
