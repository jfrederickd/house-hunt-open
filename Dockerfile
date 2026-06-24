# Single-stage image: the full app + node_modules are present so `next start`,
# `prisma migrate deploy`, and the boot-time seed all work without fuss.
# Image size isn't a concern for a two-person tool; reliability is.
FROM node:22-bookworm-slim

WORKDIR /app

# Tools some native deps expect at install time (better-sqlite3 ships prebuilt
# binaries, so this is just a safety net).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

# Copy the whole project first so the postinstall (`prisma generate`) can find
# prisma/schema.prisma. `npm install` (not `npm ci`) so Linux-only optional /
# native deps resolve here even though the lockfile was generated on macOS.
COPY . .
RUN npm install --no-audit --no-fund

# Build the app.
RUN npm run build

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
