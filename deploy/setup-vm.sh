#!/usr/bin/env bash
# Setup awal VM Ubuntu untuk agrof.sustainit.id (sekali jalan, idempoten).
# Jalankan di VM: bash setup-vm.sh
# Prasyarat: DNS A record agrof.sustainit.id sudah menunjuk ke IP publik VM.
set -euo pipefail

APP_DIR=/var/www/agrovision
REPO_URL=https://github.com/dimasperceka-se/agrovision.git
DOMAIN=agrof.sustainit.id

echo "==> Install Node.js 22 LTS (Next 16 butuh Node >= 20.9)"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Install nginx + certbot + git"
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx git

echo "==> Install Docker (untuk PostgreSQL + PostGIS via docker compose)"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "==> Clone / update repo ke $APP_DIR"
sudo mkdir -p /var/www
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER":"$USER" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi
cd "$APP_DIR"

echo "==> Siapkan .env.local"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo ""
  echo "!! Edit $APP_DIR/.env.local dulu (DATABASE_URL, dst) lalu jalankan script ini lagi."
  exit 1
fi

echo "==> Start database (PostgreSQL 16 + PostGIS di port 55433)"
sudo docker compose up -d db
until sudo docker exec agrovision-db pg_isready -U postgres -d agrovision >/dev/null 2>&1; do
  sleep 2
done

echo "==> Install dependencies + migrasi + build"
npm ci
# Urutan penting: migrasi dulu (membuat role app_rw + tabel yang dibaca
# bootstrap), baru bootstrap membuat login app_user.
npm run db:migrate
npm run db:bootstrap
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "==> Pasang systemd service"
sudo cp deploy/agrovision.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now agrovision

echo "==> Pasang nginx vhost $DOMAIN"
sudo cp deploy/nginx-agrof.sustainit.id.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> SSL via Let's Encrypt"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m dimas.perceka@systemearth.com --redirect || \
  echo "!! certbot gagal -- pastikan DNS $DOMAIN sudah mengarah ke VM ini, lalu: sudo certbot --nginx -d $DOMAIN"

echo ""
echo "Selesai. Cek: curl -I http://127.0.0.1:3000  dan  https://$DOMAIN"
