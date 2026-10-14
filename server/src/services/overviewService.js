import { fetchOverviewData } from './ticketSource.js';
import { buildOverview } from './overview.js';

// Caché corto: varios tableros abiertos (o recargas) comparten una sola
// consulta a GLPI por ventana, y las consultas simultáneas se comparten.
const TTL_MS = Number(process.env.OVERVIEW_CACHE_SECONDS || 60) * 1000;
let cached = null; // { at, value }
let inflight = null;

export async function getOverview() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  if (!inflight) {
    inflight = fetchOverviewData()
      .then((data) => {
        const value = { ...buildOverview(data), refreshedAt: new Date().toISOString(), cacheSeconds: TTL_MS / 1000 };
        cached = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
