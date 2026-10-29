# --- 1) Build del frontend ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Intervalo de auto-refresco del navegador, en segundos (0 = desactivado)
ARG VITE_REFRESH_SECONDS=120
ENV VITE_REFRESH_SECONDS=$VITE_REFRESH_SECONDS
RUN npm run build

# --- 2) Dependencias de producción del backend ---
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# --- 3) Imagen final: un solo proceso sirve API + frontend ---
FROM node:20-alpine
ENV NODE_ENV=production PORT=4000 STATIC_DIR=/app/client/dist
WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "server/src/index.js"]
