import { search } from './glpiClient.js';
import { config, TICKET_STATUS } from '../config.js';

const SO = config.glpi.searchOptions;

// Campos base que siempre traemos de cada ticket para poder armar todos los
// reportes con una sola consulta a GLPI en lugar de una por reporte.
const BASE_FIELDS = [2, SO.status, SO.category, SO.technician, SO.priority, SO.dateOpened, SO.dateClosed, SO.solvedate];

function dateCriteria(field, from, to) {
  const criteria = [];
  if (from) {
    criteria.push({ field, searchtype: 'morethan', value: from, link: 'AND' });
  }
  if (to) {
    criteria.push({ field, searchtype: 'lessthan', value: to, link: 'AND' });
  }
  return criteria;
}

async function fetchTickets({ from, to } = {}) {
  const criteria = dateCriteria(SO.dateOpened, from, to);
  const rows = await search('Ticket', {
    criteria,
    forcedisplay: BASE_FIELDS,
    sort: SO.dateOpened,
    order: 'DESC',
  });

  return rows.map((row) => ({
    id: row['2'],
    statusId: Number(row[SO.status]),
    category: row[SO.category] || 'Sin categoría',
    technician: row[SO.technician] || 'Sin asignar',
    priority: row[SO.priority],
    dateOpened: row[SO.dateOpened] || null,
    dateClosed: row[SO.dateClosed] || null,
    solvedate: row[SO.solvedate] || null,
  }));
}

export async function getTicketsByStatus({ from, to } = {}) {
  const tickets = await fetchTickets({ from, to });
  const counts = new Map();
  for (const t of tickets) {
    const label = TICKET_STATUS[t.statusId] || `Estado ${t.statusId}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return {
    total: tickets.length,
    data: [...counts.entries()].map(([status, count]) => ({ status, count })),
  };
}

export async function getTicketsByTechnician({ from, to } = {}) {
  const tickets = await fetchTickets({ from, to });
  const counts = new Map();
  for (const t of tickets) {
    counts.set(t.technician, (counts.get(t.technician) || 0) + 1);
  }
  const data = [...counts.entries()]
    .map(([technician, count]) => ({ technician, count }))
    .sort((a, b) => b.count - a.count);
  return { total: tickets.length, data };
}

export async function getTicketsByCategory({ from, to } = {}) {
  const tickets = await fetchTickets({ from, to });
  const counts = new Map();
  for (const t of tickets) {
    counts.set(t.category, (counts.get(t.category) || 0) + 1);
  }
  const data = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  return { total: tickets.length, data };
}

/**
 * Cumplimiento de SLA aproximado a partir de las fechas de apertura, de
 * resolución y del tiempo límite de resolución (`time_to_resolve`) que
 * GLPI calcula por ticket según el SLA asignado. Un ticket sin
 * `time_to_resolve` (sin SLA aplicado) se cuenta aparte como "Sin SLA".
 */
export async function getSlaCompliance({ from, to } = {}) {
  const rows = await search('Ticket', {
    criteria: dateCriteria(SO.dateOpened, from, to),
    forcedisplay: [2, SO.status, SO.timeToResolve, SO.solvedate],
  });

  let met = 0;
  let breached = 0;
  let noSla = 0;
  let pending = 0;

  const now = Date.now();
  for (const row of rows) {
    const limit = row[SO.timeToResolve];
    const solved = row[SO.solvedate];
    if (!limit) {
      noSla += 1;
      continue;
    }
    const limitTime = Date.parse(limit);
    if (solved) {
      if (Date.parse(solved) <= limitTime) met += 1;
      else breached += 1;
    } else if (now > limitTime) {
      breached += 1;
    } else {
      pending += 1;
    }
  }

  const evaluated = met + breached;
  return {
    total: rows.length,
    met,
    breached,
    pending,
    noSla,
    complianceRate: evaluated > 0 ? Number(((met / evaluated) * 100).toFixed(1)) : null,
    data: [
      { label: 'Dentro de SLA', count: met },
      { label: 'SLA incumplido', count: breached },
      { label: 'En curso (dentro de plazo)', count: pending },
      { label: 'Sin SLA', count: noSla },
    ],
  };
}

function bucketKey(dateStr, granularity) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  if (granularity === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  // Semana ISO simplificada (lunes como inicio)
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayOfWeek = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - dayOfWeek);
  return day.toISOString().slice(0, 10);
}

export async function getTrends({ from, to, granularity = 'week' } = {}) {
  const tickets = await fetchTickets({ from, to });

  const opened = new Map();
  const closed = new Map();

  for (const t of tickets) {
    const openKey = bucketKey(t.dateOpened, granularity);
    if (openKey) opened.set(openKey, (opened.get(openKey) || 0) + 1);

    if (t.dateClosed) {
      const closedKey = bucketKey(t.dateClosed, granularity);
      if (closedKey) closed.set(closedKey, (closed.get(closedKey) || 0) + 1);
    }
  }

  const allKeys = [...new Set([...opened.keys(), ...closed.keys()])].sort();
  const data = allKeys.map((key) => ({
    period: key,
    abiertos: opened.get(key) || 0,
    cerrados: closed.get(key) || 0,
  }));

  return { granularity, data };
}

export async function getSummary({ from, to } = {}) {
  const [byStatus, sla] = await Promise.all([
    getTicketsByStatus({ from, to }),
    getSlaCompliance({ from, to }),
  ]);

  const openStatuses = ['Nuevo', 'En curso (asignado)', 'En curso (planificado)', 'En espera'];
  const open = byStatus.data
    .filter((s) => openStatuses.includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);
  const closed = byStatus.data
    .filter((s) => !openStatuses.includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  return {
    totalTickets: byStatus.total,
    open,
    closed,
    slaComplianceRate: sla.complianceRate,
    slaBreached: sla.breached,
  };
}
