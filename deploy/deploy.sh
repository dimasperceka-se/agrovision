#!/usr/bin/env bash
# Deploy rilis baru: tarik kode, build, restart service.
# Jalankan di VM sebagai ubuntu: bash /var/www/agrovision/deploy/deploy.sh
set -euo pipefail

APP_DIR=/var/www/agrovision
cd "$APP_DIR"

git pull --ff-only
npm ci

# Jalankan migrasi DB yang belum applied (idempoten).
npm run db:migrate

npm run build

# output:"standalone" tidak menyertakan public/ dan .next/static otomatis
# (lihat next.config.ts) -- server.js akan menyajikannya setelah dicopy manual.
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

sudo systemctl restart agrovision
sudo systemctl --no-pager --lines=5 status agrovision
