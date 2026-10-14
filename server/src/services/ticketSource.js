import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { search } from './glpiClient.js';
import { config } from '../config.js';

// Entrega los tickets que necesita el Tablero general, ya normalizados.
// Fuente: API de GLPI (normal) o un CSV exportado de GLPI (GLPI_CSV_PATH, para
// demos/pruebas sin acceso a la API).

const SO = config.glpi.searchOptions;
const OPEN_STATUSES = new Set([1, 2, 3, 4]); // Nuevo, En curso (asig./plan.), En espera
const DAY = 86_400_000;

// Las fechas de GLPI son hora local (Lima). Se guardan como epoch "en UTC"
// para que ymd()/diferencias trabajen con la hora de pared sin desfases.
const LIMA_OFFSET = -5 * 3_600_000;
export const limaNow = () => Date.now() + LIMA_OFFSET;

function parseWallClock(s) {
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s); // API GLPI
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/.exec(s); // export CSV
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  return null;
}

const toList = (v) => {
  if (v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(/<br\s*\/?>|\$\$##\$\$/i);
  return arr.map((x) => String(x).trim()).filter(Boolean);
};

// ---------- GLPI API ----------
function fromRow(row) {
  return {
    id: row['2'],
    title: row[SO.title] || '',
    entity: row[SO.entity] || '',
    category: row[SO.category] || '',
    technicians: toList(row[SO.technician]),
    statusId: Number(row[SO.status]),
    opened: parseWallClock(row[SO.dateOpened]),
    closed: parseWallClock(row[SO.dateClosed]),
    modified: parseWallClock(row[SO.dateMod]),
  };
}
const FIELDS = [2, SO.title, SO.entity, SO.category, SO.technician, SO.status, SO.dateOpened, SO.dateClosed, SO.dateMod];
const since = (ms) => new Date(ms).toISOString().slice(0, 10);

async function fromGlpi() {
  const now = limaNow();
  const q = (criteria) => search('Ticket', { criteria, forcedisplay: FIELDS, sort: SO.dateOpened, order: 'DESC' });
  const [backlog, opened, closed, resolved] = await Promise.all([
    // 'notold' = tickets aún no resueltos ni cerrados (Nuevo, En curso, En espera)
    q([{ field: SO.status, searchtype: 'equals', value: 'notold' }]),
    q([{ field: SO.dateOpened, searchtype: 'morethan', value: since(now - 30 * DAY) }]),
    q([{ field: SO.dateClosed, searchtype: 'morethan', value: since(now - 60 * DAY) }]),
    // Resueltos que aún no se cierran (estado 5)
    q([{ field: SO.status, searchtype: 'equals', value: 5 }]),
  ]);
  return { now, backlog: backlog.map(fromRow), opened: opened.map(fromRow), closed: closed.map(fromRow), resolved: resolved.map(fromRow) };
}

// ---------- CSV exportado ----------
const STATUS_BY_LABEL = {
  Nuevo: 1,
  'En curso (asignada)': 2,
  'En curso (planificada)': 3,
  'En espera': 4,
  Resuelto: 5,
  Cerrado: 6,
};

function fromCsv(path) {
  const rows = parse(fs.readFileSync(path), { delimiter: ';', columns: true, bom: true, relax_quotes: true, skip_empty_lines: true });
  const tickets = rows.map((r) => ({
    id: String(r['ID']).replace(/\D/g, ''),
    title: r['Título'] || '',
    entity: r['Entidad'] || '',
    category: (r['Categoría'] || '').replace(/&#62;/g, '>').trim(),
    technicians: toList(r['Asignado a - Técnico']),
    statusId: STATUS_BY_LABEL[r['Estado']] ?? 6,
    opened: parseWallClock(r['Fecha de apertura']),
    closed: parseWallClock(r['Fecha de cierre']),
    modified: parseWallClock(r['Última modificación']),
  }));
  // Fecha de corte = la mayor entre apertura y última modificación (regla del reporte).
  const now = Math.max(...tickets.map((t) => Math.max(t.opened || 0, t.modified || 0)));
  return {
    now,
    backlog: tickets.filter((t) => OPEN_STATUSES.has(t.statusId)),
    opened: tickets.filter((t) => t.opened >= now - 30 * DAY),
    closed: tickets.filter((t) => t.closed && t.closed >= now - 60 * DAY),
    resolved: tickets.filter((t) => t.statusId === 5),
  };
}

export async function fetchOverviewData() {
  return process.env.GLPI_CSV_PATH ? fromCsv(process.env.GLPI_CSV_PATH) : fromGlpi();
}
