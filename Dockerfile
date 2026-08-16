# --- Build stage ---
FROM node:22-bookworm-slim AS builder

# better-sqlite3 compiles native bindings during npm install; needs build tools.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# data.db lives here — mount a volume on this path in Coolify so earthquake
# subscriptions and community reports survive redeploys.
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/data.db

CMD ["node", "dist/server.cjs"]
