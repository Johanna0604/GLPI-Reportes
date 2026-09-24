import { config } from '../config.js';

/**
 * Protección opcional para el dashboard: si DASHBOARD_USER/PASSWORD están
 * definidos en .env, exige HTTP Basic Auth en todas las rutas /api/*.
 * Si no están definidos, no aplica ninguna restricción (útil en redes
 * internas ya perimetradas).
 */
export function basicAuth(req, res, next) {
  const { user, password } = config.dashboardAuth;
  if (!user || !password) return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [reqUser, reqPassword] = Buffer.from(encoded, 'base64').toString().split(':');
    if (reqUser === user && reqPassword === password) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="GLPI Reportes"');
  return res.status(401).json({ error: 'Autenticación requerida' });
}
