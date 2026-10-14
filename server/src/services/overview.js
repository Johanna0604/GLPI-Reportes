import { TECHNICIANS, SOP } from '../data/teams.js';

// Lógica pura del Tablero general: recibe tickets ya normalizados y devuelve
// los 12 indicadores. No toca red ni disco, por eso se puede probar sola.
//
// Ticket normalizado:
//   { id, title, entity, category, technicians: string[], statusId,
//     opened, closed, modified }   (fechas como epoch ms "hora Lima en UTC")

const DAY = 86_400_000;
const HOUR = 3_600_000;
export const WINDOW_DAYS = 30;
export const STALE_DAYS = 7;
const EXCLUDED_FROM_LISTS = /MODIF[- ]?DATOS|ELIM/i;

export const BUCKETS = [
  { key: '0-2', label: '0–2 días', max: 2 },
  { key: '3-7', label: '3–7 días', max: 7 },
  { key: '8-15', label: '8–15 días', max: 15 },
  { key: '16-30', label: '16–30 días', max: 30 },
  { key: '30+', label: 'Más de 30 días', max: Infinity },
];

const normName = (s) => String(s).replace(/\s+/g, ' ').trim().toUpperCase();
const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
// "PAE > UNIDADES TERRITORIALES > UT Cusco" -> "UT Cusco" (máx. 36 caracteres)
const shortEntity = (e) => {
  const last = String(e).split(' > ').pop().trim();
  return last.length > 36 ? `${last.slice(0, 35)}…` : last;
};
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);

function median(sorted) {
  if (!sorted.length) return null;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
function percentile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

function resolveTech(raw, unknown) {
  const key = normName(raw);
  const hit = TECHNICIANS[key];
  if (hit) return { name: hit[0], team: hit[1] };
  unknown.add(titleCase(key));
  return { name: titleCase(key), team: SOP };
}

function tone(value, { goodMax, warnMax }) {
  if (value <= goodMax) return 'good';
  if (value <= warnMax) return 'warning';
  return 'critical';
}

/**
 * @param {{backlog: object[], opened: object[], closed: object[], now: number}} input
 *   backlog: tickets en estados abiertos (Nuevo, En curso, En espera)
 *   opened : tickets abiertos en los últimos 30 días
 *   closed : tickets cerrados en los últimos 60 días (30 actuales + 30 previos)
 */
export function buildOverview({ backlog, opened, closed, now }) {
  const unknown = new Set();
  const age = (t) => (now - t.opened) / DAY;
  const today = ymd(now);
  const windowStart = now - WINDOW_DAYS * DAY;

  // ---- Backlog ----
  const pendientes = backlog.length;
  const sinAsignar = backlog.filter((t) => !t.technicians.length).length;
  const over7 = backlog.filter((t) => age(t) > 7).length;
  const maxAge = pendientes ? Math.round(Math.max(...backlog.map(age))) : 0;
  const stale = backlog.filter((t) => (now - t.modified) / DAY > STALE_DAYS).length;

  const buckets = BUCKETS.map((b) => ({ key: b.key, label: b.label, count: 0 }));
  for (const t of backlog) {
    const d = age(t);
    const i = BUCKETS.findIndex((b) => d <= b.max);
    buckets[i].count += 1;
  }

  // ---- Ranking por técnico (ticket con varios técnicos cuenta una vez por técnico) ----
  const byTech = new Map();
  for (const t of backlog) {
    const people = t.technicians.length
      ? t.technicians.map((n) => resolveTech(n, unknown))
      : [{ name: 'Sin asignar', team: 'Sin asignar' }];
    for (const p of people) {
      if (!byTech.has(p.name)) byTech.set(p.name, { technician: p.name, team: p.team, count: 0, maxDays: 0, tickets: [] });
      const row = byTech.get(p.name);
      row.count += 1;
      row.maxDays = Math.max(row.maxDays, age(t));
      if (!EXCLUDED_FROM_LISTS.test(t.title || '')) {
        row.tickets.push({ id: t.id, title: t.title, days: Math.round(age(t)), statusId: t.statusId });
      }
    }
  }
  const technicians = [...byTech.values()]
    .map((r) => ({
      technician: r.technician,
      team: r.team,
      count: r.count,
      maxDays: Math.round(r.maxDays),
      oldest: r.tickets.sort((a, b) => b.days - a.days).slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count || b.maxDays - a.maxDays);

  // ---- Hoy y últimos 30 días ----
  const openedToday = opened.filter((t) => ymd(t.opened) === today).length;
  const closedToday = closed.filter((t) => t.closed && ymd(t.closed) === today).length;

  const days = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) days.push(ymd(now - i * DAY));
  const inCount = new Map(days.map((d) => [d, 0]));
  const outCount = new Map(days.map((d) => [d, 0]));
  for (const t of opened) {
    const d = ymd(t.opened);
    if (inCount.has(d)) inCount.set(d, inCount.get(d) + 1);
  }
  for (const t of closed) {
    const d = t.closed && ymd(t.closed);
    if (d && outCount.has(d)) outCount.set(d, outCount.get(d) + 1);
  }
  let net = 0;
  const flow = days.map((date) => {
    const ingresados = inCount.get(date);
    const cerrados = outCount.get(date);
    net += ingresados - cerrados;
    return { date, ingresados, cerrados, saldo: net };
  });
  const totalIn = flow.reduce((s, d) => s + d.ingresados, 0);
  const totalOut = flow.reduce((s, d) => s + d.cerrados, 0);
  // Días seguidos (hasta hoy) en que ingresó más de lo que se cerró.
  let growingStreak = 0;
  for (let i = flow.length - 1; i >= 0 && flow[i].ingresados > flow[i].cerrados; i -= 1) growingStreak += 1;

  // ---- Tiempo de resolución (horas) ----
  const hours = (list) =>
    list
      .filter((t) => t.closed && t.opened && t.closed >= t.opened)
      .map((t) => (t.closed - t.opened) / HOUR)
      .sort((a, b) => a - b);
  const curr = hours(closed.filter((t) => t.closed >= windowStart));
  const prev = hours(closed.filter((t) => t.closed < windowStart && t.closed >= windowStart - WINDOW_DAYS * DAY));
  const medNow = median(curr);
  const medPrev = median(prev);
  const changePct = medNow != null && medPrev ? round1(((medNow - medPrev) / medPrev) * 100) : null;

  // ---- Entidades y categoría (últimos 30 días) ----
  const ent = new Map();
  for (const t of opened) {
    const name = t.entity ? shortEntity(t.entity) : 'Sin entidad';
    ent.set(name, (ent.get(name) || 0) + 1);
  }
  const entities = [...ent.entries()]
    .map(([entity, count]) => ({ entity, count, pct: round1((count / opened.length) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const noCat = opened.filter((t) => !t.category).length;
  const noCatPct = opened.length ? round1((noCat / opened.length) * 100) : 0;

  const over7Share = pendientes ? (over7 / pendientes) * 100 : 0;
  return {
    asOf: new Date(now).toISOString().slice(0, 16).replace('T', ' '),
    windowDays: WINDOW_DAYS,
    kpis: {
      pendientes: { value: pendientes, tone: tone(pendientes, { goodMax: 60, warnMax: 100 }) },
      sinAsignar: { value: sinAsignar, tone: sinAsignar > 0 ? 'critical' : 'good' },
      over7: { value: over7, tone: over7 === 0 ? 'good' : over7Share <= 10 ? 'warning' : 'critical' },
      maxAge: { value: maxAge, tone: maxAge > 30 ? 'critical' : maxAge > 7 ? 'warning' : 'good' },
      stale: { value: stale, tone: stale > 0 ? 'critical' : 'good' },
      today: {
        opened: openedToday,
        closed: closedToday,
        tone: growingStreak >= 3 ? 'critical' : openedToday > closedToday ? 'warning' : 'good',
      },
      resolution: {
        medianHours: round1(medNow),
        p90Hours: round1(percentile(curr, 0.9)),
        changePct,
        tone: changePct != null && changePct > 25 ? 'critical' : 'good',
      },
      noCategory: { value: noCatPct, count: noCat, tone: noCatPct < 5 ? 'good' : noCatPct <= 20 ? 'warning' : 'critical' },
    },
    buckets,
    technicians,
    flow,
    flowTotals: { ingresados: totalIn, cerrados: totalOut, saldo: totalIn - totalOut, growingStreak },
    entities,
    ticketsInWindow: opened.length,
    unknownTechnicians: [...unknown].sort(),
  };
}
