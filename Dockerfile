# ── Stage 1: Build frontend ──
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production image ──
FROM node:22-alpine

WORKDIR /app

# Install only production + server deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server ./server

# Data volume for SQLite persistence
RUN mkdir -p /data
VOLUME /data
ENV DB_PATH=/data/chargeflow.db

# CSV export path – set to "" to disable, or mount an external volume
# e.g. -v /my/backup:/export -e CSV_PATH=/export/chargeflow.csv
ENV CSV_PATH=/data/chargeflow.csv

ENV PORT=7920
EXPOSE 7920

CMD ["npx", "tsx", "server/index.ts"]
