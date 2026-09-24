import 'dotenv/config';

function required(name, value) {
  if (!value) {
    console.warn(`[config] Falta variable de entorno ${name}. Revisa tu archivo .env`);
  }
  return value;
}

export const config = {
  glpi: {
    apiUrl: required('GLPI_API_URL', process.env.GLPI_API_URL),
    appToken: required('GLPI_APP_TOKEN', process.env.GLPI_APP_TOKEN),
    userToken: process.env.GLPI_USER_TOKEN || '',
    basicUser: process.env.GLPI_BASIC_USER || '',
    basicPassword: process.env.GLPI_BASIC_PASSWORD || '',
    tlsRejectUnauthorized: process.env.GLPI_TLS_REJECT_UNAUTHORIZED !== 'false',
    searchOptions: {
      status: Number(process.env.GLPI_SO_STATUS || 12),
      category: Number(process.env.GLPI_SO_CATEGORY || 7),
      technician: Number(process.env.GLPI_SO_TECHNICIAN || 5),
      group: Number(process.env.GLPI_SO_GROUP || 8),
      priority: Number(process.env.GLPI_SO_PRIORITY || 3),
      dateOpened: Number(process.env.GLPI_SO_DATE_OPENED || 15),
      dateClosed: Number(process.env.GLPI_SO_DATE_CLOSED || 16),
      timeToResolve: Number(process.env.GLPI_SO_TIME_TO_RESOLVE || 18),
      solvedate: Number(process.env.GLPI_SO_SOLVEDATE || 17),
    },
  },
  server: {
    port: Number(process.env.PORT || 4000),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  dashboardAuth: {
    user: process.env.DASHBOARD_USER || '',
    password: process.env.DASHBOARD_PASSWORD || '',
  },
};

// Los códigos de estado de ticket son fijos en el núcleo de GLPI
// (independientes de personalizaciones): 1 Nuevo, 2 En curso (asignado),
// 3 En curso (planificado), 4 En espera, 5 Resuelto, 6 Cerrado.
export const TICKET_STATUS = {
  1: 'Nuevo',
  2: 'En curso (asignado)',
  3: 'En curso (planificado)',
  4: 'En espera',
  5: 'Resuelto',
  6: 'Cerrado',
};
