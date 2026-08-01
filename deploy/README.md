# Deployment — agrof.sustainit.id

Target: VM Ubuntu, app di `/var/www/agrovision`, Next.js standalone di port 3000
di belakang nginx, DB PostgreSQL 16 + PostGIS via docker compose (port 55433).

## Setup awal (sekali)

```bash
# di VM
curl -fsSL https://raw.githubusercontent.com/dimasperceka-se/agrovision/main/deploy/setup-vm.sh -o setup-vm.sh
bash setup-vm.sh
# script berhenti setelah membuat .env.local -> edit dulu, lalu jalankan lagi
```

Pastikan DNS A record `agrof.sustainit.id` sudah menunjuk ke IP publik VM
sebelum menjalankan certbot.

## Deploy rilis baru

```bash
bash /var/www/agrovision/deploy/deploy.sh
```

## File

- `setup-vm.sh` — provisioning VM: Node 22, nginx, certbot, Docker, clone, build, service.
- `deploy.sh` — pull + migrasi + build + restart.
- `agrovision.service` — systemd unit (jalankan `node .next/standalone/server.js`).
- `nginx-agrof.sustainit.id.conf` — reverse proxy + batas upload 10m.

## Operasional

```bash
sudo systemctl status agrovision      # status app
journalctl -u agrovision -f           # log app
sudo docker compose logs -f db        # log database
npm run db:status                     # status migrasi
```
