# AgroVision — image produksi untuk Cloud Run (Next.js standalone).
# Multi-stage: deps → build → runner ramping.
# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env dummy KHUSUS build: koneksi DB dibuat saat modul di-import, dan `next build`
# meng-import halaman. Build tidak konek DB sungguhan — runtime pakai secret Cloud Run.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    SESSION_SECRET=build_time_only_placeholder_min_32_chars_0000
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
# output:"standalone" tidak menyertakan public/ & .next/static otomatis → copy manual.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
