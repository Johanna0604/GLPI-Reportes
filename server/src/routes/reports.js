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

function wrap(handler) {
  return async (req, res) => {
    try {
      const result = await handler(parseRange(req));
      res.json(result);
    } catch (error) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.[1] || error.message || 'Error consultando GLPI';
      console.error('[reports]', message);
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
