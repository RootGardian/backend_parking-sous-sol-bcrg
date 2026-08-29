import fs from 'fs';
import path from 'path';

const swaggerPath = path.join(process.cwd(), 'swagger.json');
const swaggerStr = fs.readFileSync(swaggerPath, 'utf8');
const swagger = JSON.parse(swaggerStr);

// Rename /admin/flotte to /admin/vehicules
if (swagger.paths['/admin/flotte']) {
  swagger.paths['/admin/vehicules'] = swagger.paths['/admin/flotte'];
  delete swagger.paths['/admin/flotte'];
}

// Rename /admin/flotte/stats to /admin/vehicules/stats
if (swagger.paths['/admin/flotte/stats']) {
  swagger.paths['/admin/vehicules/stats'] = swagger.paths['/admin/flotte/stats'];
  delete swagger.paths['/admin/flotte/stats'];
}

fs.writeFileSync(swaggerPath, JSON.stringify(swagger, null, 2), 'utf8');
console.log('swagger.json renamed endpoints successfully.');
