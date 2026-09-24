import axios from 'axios';
import https from 'node:https';
import { config } from '../config.js';

// Cliente delgado sobre la API REST de GLPI: maneja el ciclo de vida de la
// sesión (initSession/killSession) y expone `search` con paginación
// automática. Ver: https://github.com/glpi-project/glpi/blob/main/apirest.md

const httpsAgent = new https.Agent({
  rejectUnauthorized: config.glpi.tlsRejectUnauthorized,
});

const http = axios.create({
  baseURL: config.glpi.apiUrl,
  httpsAgent,
  timeout: 30_000,
});

let sessionToken = null;
let sessionPromise = null;

function authHeader() {
  if (config.glpi.userToken) {
    return `user_token ${config.glpi.userToken}`;
  }
  if (config.glpi.basicUser && config.glpi.basicPassword) {
    const encoded = Buffer.from(
      `${config.glpi.basicUser}:${config.glpi.basicPassword}`
    ).toString('base64');
    return `Basic ${encoded}`;
  }
  throw new Error(
    'No hay credenciales de GLPI configuradas: define GLPI_USER_TOKEN o GLPI_BASIC_USER/GLPI_BASIC_PASSWORD'
  );
}

async function initSession() {
  const { data } = await http.get('/initSession', {
    headers: {
      'App-Token': config.glpi.appToken,
      Authorization: authHeader(),
    },
    params: { get_full_session: false },
  });
  return data.session_token;
}

async function getSessionToken() {
  if (sessionToken) return sessionToken;
  if (!sessionPromise) {
    sessionPromise = initSession()
      .then((token) => {
        sessionToken = token;
        return token;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }
  return sessionPromise;
}

async function request(method, url, options = {}, retry = true) {
  const token = await getSessionToken();
  try {
    const response = await http.request({
      method,
      url,
      ...options,
      headers: {
        ...options.headers,
        'App-Token': config.glpi.appToken,
        'Session-Token': token,
      },
    });
    return response;
  } catch (error) {
    const status = error.response?.status;
    // Token de sesión expirado o inválido: reintenta una vez con sesión nueva.
    if (retry && (status === 401 || status === 403)) {
      sessionToken = null;
      return request(method, url, options, false);
    }
    throw error;
  }
}

export async function killSession() {
  if (!sessionToken) return;
  try {
    await request('GET', '/killSession');
  } finally {
    sessionToken = null;
  }
}

/**
 * Ejecuta una búsqueda contra /search/{itemtype} paginando hasta traer
 * todos los resultados (o hasta `maxItems`), y devuelve las filas planas
 * que GLPI arma según `forcedisplay`.
 */
export async function search(itemtype, { criteria = [], forcedisplay = [], sort, order = 'ASC', maxItems = 20000, pageSize = 2000 } = {}) {
  const rows = [];
  let start = 0;
  let total = Infinity;

  while (start < total && rows.length < maxItems) {
    const params = buildSearchParams({ criteria, forcedisplay, sort, order, start, pageSize });
    const response = await request('GET', `/search/${itemtype}`, {
      params,
      validateStatus: (s) => s === 200 || s === 206,
    });

    const data = response.data;
    const contentRange = response.headers['content-range']; // "0-1999/12345"
    if (contentRange) {
      total = Number(contentRange.split('/')[1] || data.totalcount || 0);
    } else {
      total = data.totalcount ?? (data.data ? data.data.length : 0);
    }

    const pageRows = data.data || [];
    rows.push(...pageRows);

    if (pageRows.length === 0) break;
    start += pageRows.length;
  }

  return rows;
}

function buildSearchParams({ criteria, forcedisplay, sort, order, start, pageSize }) {
  const params = {
    range: `${start}-${start + pageSize - 1}`,
    order,
  };
  if (sort) params.sort = sort;

  criteria.forEach((c, i) => {
    params[`criteria[${i}][field]`] = c.field;
    params[`criteria[${i}][searchtype]`] = c.searchtype ?? 'equals';
    params[`criteria[${i}][value]`] = c.value;
    if (c.link) params[`criteria[${i}][link]`] = c.link;
  });

  forcedisplay.forEach((fieldId, i) => {
    params[`forcedisplay[${i}]`] = fieldId;
  });

  return params;
}

export async function listSearchOptions(itemtype) {
  const response = await request('GET', `/listSearchOptions/${itemtype}`);
  return response.data;
}
