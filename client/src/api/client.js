const BASE = '/api/reports';

async function get(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const url = `${BASE}${path}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status} consultando ${path}`);
  }
  return res.json();
}

export const api = {
  summary: (range) => get('/summary', range),
  byStatus: (range) => get('/by-status', range),
  byTechnician: (range) => get('/by-technician', range),
  byCategory: (range) => get('/by-category', range),
  sla: (range) => get('/sla', range),
  trends: (range) => get('/trends', range),
};
