import { config } from '../config.js';

// Caché en memoria con TTL. Evita golpear la API de GLPI en cada carga o
// auto-refresco del dashboard: respuestas iguales (mismo reporte y rango)
// se reutilizan durante `config.cache.ttlSeconds`. Las consultas idénticas
// concurrentes comparten una sola llamada a GLPI.
const entries = new Map(); // key -> { value, expiresAt, storedAt }
const inflight = new Map(); // key -> Promise

export function cacheStats() {
  return { entries: entries.size, ttlSeconds: config.cache.ttlSeconds };
}

/**
 * Devuelve { value, cache: 'HIT'|'MISS'|'STALE', storedAt }.
 * Si GLPI falla pero hay un dato previo (aunque vencido), lo sirve como
 * STALE para que el tablero no quede en blanco ante una caída momentánea.
 */
export async function cached(key, loader) {
  const ttlMs = config.cache.ttlSeconds * 1000;
  const now = Date.now();
  const hit = entries.get(key);
  if (ttlMs > 0 && hit && hit.expiresAt > now) {
    return { value: hit.value, cache: 'HIT', storedAt: hit.storedAt };
  }

  let promise = inflight.get(key);
  if (!promise) {
    promise = loader().finally(() => inflight.delete(key));
    inflight.set(key, promise);
  }

  try {
    const value = await promise;
    const storedAt = Date.now();
    if (ttlMs > 0) {
      entries.set(key, { value, storedAt, expiresAt: storedAt + ttlMs });
      pruneIfNeeded();
    }
    return { value, cache: 'MISS', storedAt };
  } catch (error) {
    if (hit) return { value: hit.value, cache: 'STALE', storedAt: hit.storedAt };
    throw error;
  }
}

// Los rangos de fechas libres pueden generar muchas claves; se limita el
// tamaño descartando primero lo vencido y luego lo más antiguo.
const MAX_ENTRIES = 500;
function pruneIfNeeded() {
  if (entries.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, e] of entries) if (e.expiresAt <= now) entries.delete(k);
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
}
