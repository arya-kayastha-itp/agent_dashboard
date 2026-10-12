# Single image: Express API + the built React SPA, served from one origin.
# Debian slim (not Alpine) because @databricks/sql pulls in native lz4 bindings.

# --- Build the frontend ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY frontend frontend
RUN npm run build --workspace frontend

# --- Runtime: backend prod deps + built SPA ---
FROM node:22-slim
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend && npm cache clean --force
COPY backend/src backend/src
COPY --from=build /app/frontend/dist frontend/dist
USER node
EXPOSE 4000
CMD ["node", "backend/src/server.js"]
