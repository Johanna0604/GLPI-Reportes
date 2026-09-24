import { Router } from 'express';
import {
  getTicketsByStatus,
  getTicketsByTechnician,
  getTicketsByCategory,
  getSlaCompliance,
  getTrends,
  getSummary,
} from '../services/reportService.js';

export const reportsRouter = Router();

function parseRange(req) {
  const { from, to, granularity } = req.query;
  return { from: from || undefined, to: to || undefined, granularity: granularity || undefined };
}

// GLPI devuelve sus propios errores como array [codigo, mensaje], pero un
// proxy/gateway intermedio (o un error de red) puede devolver una respuesta
// con forma distinta (string, HTML, objeto). Sin este chequeo, indexar
// ciegamente `data[1]` sobre un string devuelve un solo carácter en vez del
// mensaje real.
function extractErrorMessage(error) {
  const data = error.response?.data;
  if (Array.isArray(data)) return data[1] || data[0] || JSON.stringify(data);
  if (typeof data === 'string' && data.trim()) return data.slice(0, 500);
  if (data && typeof data === 'object') {
    return data.message || data.error || JSON.stringify(data).slice(0, 500);
  }
  return error.message || 'Error consultando GLPI';
}

function wrap(handler) {
  return async (req, res) => {
    try {
      const result = await handler(parseRange(req));
      res.json(result);
    } catch (error) {
      const status = error.response?.status || 500;
      const message = extractErrorMessage(error);
      console.error('[reports]', status, message);
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  };
}

reportsRouter.get('/summary', wrap(getSummary));
reportsRouter.get('/by-status', wrap(getTicketsByStatus));
reportsRouter.get('/by-technician', wrap(getTicketsByTechnician));
reportsRouter.get('/by-category', wrap(getTicketsByCategory));
reportsRouter.get('/sla', wrap(getSlaCompliance));
reportsRouter.get('/trends', wrap(getTrends));
