FROM node:24-alpine

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (y compris devDependencies pour Prisma et TS)
RUN npm ci

# Copier le reste du code source
COPY . .

# Générer les types du contrat Prisma Next
RUN npm run contract:emit

# Exposer le port sur lequel l'API va tourner
EXPOSE 3000

# Commande de démarrage (défini dans package.json comme "tsx src/index.ts")
CMD ["npm", "start"]
