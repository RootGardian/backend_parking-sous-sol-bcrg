const fs = require('fs');
const path = require('path');
// Use ts-node to require a TS file
require('ts-node').register();

const { swaggerDocument } = require('./src/swagger');

fs.writeFileSync(
  path.join(process.argv[2], 'swagger.json'),
  JSON.stringify(swaggerDocument, null, 2),
  'utf8'
);
console.log('swagger.json generated successfully.');
