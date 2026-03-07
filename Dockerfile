# ── Stage 1: Build frontend ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production image ──
FROM node:22-alpine

# Install su-exec to switch users safely at runtime
RUN apk add --no-cache su-exec

WORKDIR /app

# Install only production + server deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend & server source
COPY --from=builder /app/dist ./dist
COPY server ./server

# Create the user 'app' and the /data directory
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /data

# Copy and setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

VOLUME /data
ENV DB_PATH=/data/chargeflow.db
ENV CSV_PATH=/data/chargeflow.csv
ENV NODE_ENV=production
ENV PORT=7920
EXPOSE 7920

# Start as root so entrypoint.sh can modify UIDs
USER root

ENTRYPOINT ["/entrypoint.sh"]

CMD ["node", "--import", "tsx/esm", "server/index.ts"]