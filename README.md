# GLPI Reportes — UTI PAE

Dashboard web para visualizar reportes de la mesa de ayuda de GLPI
(`mesadeayuda.gob.pe`): tickets por estado y técnico, cumplimiento de SLA,
distribución por categoría y volumen histórico de tickets.

- **Backend**: Node.js + Express (`server/`). Habla directamente con la API
  REST de GLPI, agrega los datos y expone endpoints propios.
- **Frontend**: React + Vite (`client/`). Dashboard con filtros de rango de
  fechas y gráficos.

El programa **no reemplaza a GLPI**, solo lee datos de él a través de su API
REST oficial usando las credenciales del usuario superadmin.

## 1. Habilitar la API REST en GLPI

Con tu usuario superadmin, en `https://mesadeayuda.gob.pe`:

1. **Habilitar la API**: `Configuración` → `General` → pestaña **API**.
   - Activa "Habilitar la API REST" (`Enable REST API`).
   - En la lista de accesos ("API clients"), edita o crea uno con acceso
     completo, y en la sección **App-Token** pulsa "Generar" (Regenerate).
     Copia ese valor — es `GLPI_APP_TOKEN`.
2. **Generar el token personal del superadmin**: entra a tu perfil (ícono de
   usuario, arriba a la derecha) → pestaña **Configuración remota de
   acceso** (`Remote access keys`) → sección **API token** → "Generar".
   Copia ese valor — es `GLPI_USER_TOKEN`.

   > Alternativa (no recomendada para producción): usar usuario/contraseña
   > directamente vía `GLPI_BASIC_USER` / `GLPI_BASIC_PASSWORD` en lugar del
   > token.

3. Verifica que el firewall/red permita que el servidor donde correrá este
   backend llegue a `https://mesadeayuda.gob.pe/apirest.php`.

## 2. Verificar los IDs de campos (search options)

GLPI identifica los campos de un ticket con IDs numéricos ("search
options") que pueden variar si la instalación tiene formularios
personalizados o plugins. Los valores por defecto en `.env.example`
corresponden a una instalación estándar de GLPI 10.x:

| Variable | Campo | Valor por defecto |
|---|---|---|
| `GLPI_SO_STATUS` | Estado | 12 |
| `GLPI_SO_CATEGORY` | Categoría | 7 |
| `GLPI_SO_TECHNICIAN` | Técnico asignado | 5 |
| `GLPI_SO_DATE_OPENED` | Fecha de apertura | 15 |
| `GLPI_SO_DATE_CLOSED` | Fecha de cierre | 16 |
| `GLPI_SO_SOLVEDATE` | Fecha de resolución | 17 |
| `GLPI_SO_TIME_TO_RESOLVE` | Límite de SLA (time_to_resolve) | 18 |

Para confirmarlos en tu instancia, con sesión iniciada como superadmin abre
en el navegador (o con `curl` usando tus tokens):

```
GET https://mesadeayuda.gob.pe/apirest.php/listSearchOptions/Ticket
```

Busca en la respuesta la entrada cuyo `name` coincide con el campo (por
ejemplo "Estado", "Categoría", "Técnico") y usa esa clave numérica. Si
difiere de los valores por defecto, ajústala en tu `.env`.

## 3. Configuración del proyecto

```bash
cp .env.example .env
```

Completa en `.env`:

- `GLPI_API_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN` (paso 1).
- Opcional: `GLPI_SO_*` si tus IDs de campos difieren (paso 2).
- Opcional pero recomendado: `DASHBOARD_USER` / `DASHBOARD_PASSWORD` para
  proteger el dashboard con autenticación básica además de la red interna.

## 4. Instalación y ejecución (desarrollo)

```bash
# Backend
cd server
npm install
npm run dev        # http://localhost:4000

# Frontend (en otra terminal)
cd client
npm install
npm run dev         # http://localhost:5173
```

El frontend en desarrollo redirige `/api` al backend en `localhost:4000`
(configurado en `client/vite.config.js`).

Prueba primero el backend por separado:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/reports/summary
```

Si `summary` responde con un error de autenticación de GLPI, revisa el App
Token / User Token. Si responde con conteos en cero pero sin error, revisa
los `GLPI_SO_*` (paso 2) — probablemente los IDs de campo no coinciden con
tu instancia.

## 5. Despliegue on-premise

Al ser un despliegue interno de la UTI, la forma más simple es:

1. **Build del frontend**:
   ```bash
   cd client
   npm install
   npm run build      # genera client/dist
   ```
2. **Servir el frontend construido desde el propio backend Express**
   (opción recomendada, un solo proceso/puerto): agrega un middleware de
   archivos estáticos en `server/src/index.js` apuntando a `client/dist`, o
   sirve `client/dist` con Nginx/Apache y haz proxy de `/api` al backend
   Node (puerto `4000` por defecto).
3. **Backend como servicio persistente**: usa `pm2`, un servicio `systemd`,
   o un contenedor Docker para mantener `node server/src/index.js`
   corriendo y reiniciándose ante fallos.
4. Coloca el backend en la misma red/VLAN desde la que se puede alcanzar
   `mesadeayuda.gob.pe`, y restringe el acceso al dashboard (VPN interna,
   IP allowlist, o el `DASHBOARD_USER`/`DASHBOARD_PASSWORD` ya incluido)
   ya que expone reportes de tickets.

## Estructura del proyecto

```
server/               Backend Express
  src/config.js        Variables de entorno y search options
  src/services/glpiClient.js   Sesión GLPI + búsqueda paginada
  src/services/reportService.js  Agregación de reportes
  src/routes/reports.js        Endpoints /api/reports/*
  src/middleware/basicAuth.js  Protección opcional del dashboard

client/               Frontend React + Vite
  src/App.jsx           Layout del dashboard
  src/components/       Gráficos y filtros
  src/api/client.js     Cliente HTTP hacia /api/reports/*
```

## Endpoints del backend

Todos bajo `/api/reports`, con parámetros de query opcionales
`from`/`to` (fechas `YYYY-MM-DD`) y `granularity` (`week`|`month` para
`/trends`):

- `GET /summary` — totales (tickets, abiertos, cerrados, % SLA)
- `GET /by-status` — conteo por estado
- `GET /by-technician` — conteo por técnico asignado
- `GET /by-category` — conteo por categoría
- `GET /sla` — cumplimiento de SLA
- `GET /trends` — tickets abiertos/cerrados por periodo

## Próximos pasos sugeridos

- Confirmar los `GLPI_SO_*` contra la instancia real de mesadeayuda.gob.pe.
- Definir si se necesita más de un usuario de acceso al dashboard (hoy solo
  hay una autenticación básica compartida).
- Si el volumen de tickets es muy alto, considerar cachear las respuestas
  de `/api/reports/*` unos minutos para no golpear la API de GLPI en cada
  carga del dashboard.
