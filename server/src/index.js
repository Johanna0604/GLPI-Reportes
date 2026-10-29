import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { config } from './config.js';
import { basicAuth } from './middleware/basicAuth.js';
import { reportsRouter } from './routes/reports.js';
import { killSession } from './services/glpiClient.js';

const app = express();

app.use(cors({ origin: config.server.corsOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, glpiConfigured: Boolean(config.glpi.apiUrl && config.glpi.appToken) });
});

app.use('/api/reports', basicAuth, reportsRouter);

// En producción (Docker) el mismo proceso sirve el frontend construido.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(path.join(staticDir, 'index.html'))) {
  app.use(basicAuth, express.static(staticDir));
  app.get(/^(?!\/api\/).*/, basicAuth, (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const server = app.listen(config.server.port, () => {
  console.log(`GLPI Reportes API escuchando en http://localhost:${config.server.port}`);
});

async function shutdown() {
  console.log('Cerrando sesión GLPI y apagando servidor...');
  await killSession().catch(() => {});
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
