# Deploying to Hetzner Cloud (167.235.193.135)

This project ships as two Docker images (FastAPI backend + nginx-served
React/Vite frontend) fronted by **Caddy**, which automatically provisions
and renews free HTTPS certificates (Let's Encrypt) for both domains.

- Frontend: `https://dfdst.ris.africa`
- Backend API: `https://api.dfdst.ris.africa`
- Server: `167.235.193.135`

## 0. DNS — do this first

At your DNS provider for `ris.africa`, create two **A records** pointing to
the Hetzner server's public IP:

| Type | Name                    | Value            |
|------|-------------------------|------------------|
| A    | dfdst.ris.africa        | 167.235.193.135  |
| A    | api.dfdst.ris.africa    | 167.235.193.135  |

Wait for propagation (`dig dfdst.ris.africa` / `dig api.dfdst.ris.africa`)
before starting Caddy, otherwise Let's Encrypt HTTP-01 validation will fail.

## 1. Server prerequisites (once)

SSH into the server, then:

```bash
apt-get update && apt-get install -y docker.io docker-compose-plugin git
systemctl enable --now docker
```

Open the firewall (Hetzner Cloud Firewall or ufw) for ports **80** and
**443** only. Ports 8086/8087 are internal to the Docker network and are
NOT published to the host — Caddy is the only public entry point.

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 2. Get the code onto the server

```bash
cd /opt
git clone https://github.com/Stanearl/Agronomic-Intel-Platform.git dfdst
cd dfdst
```

## 3. Environment files

**These are committed to the repo** (they contain no secrets — only public
domain names and non-sensitive tuning values), so `git clone`/`git pull`
already populates them on the server automatically:

- `backend/.env` — FastAPI settings (CORS, rate limiting, trusted hosts)
- `frontend/.env` — informational only for `npm run build` outside Docker
- `.env` (repo root) — consumed by `docker-compose.yml` for build args and
  the Caddy domains/ACME email

No manual copy step is required. Just double-check the values match your
real domains before the first `docker compose up`:

```bash
cat .env backend/.env frontend/.env
```

If you ever need to change `ACME_EMAIL` (used by Let's Encrypt for
expiry/renewal notices), edit the root `.env` directly and re-run
`docker compose up -d`.


## 4. Build and run

```bash
docker compose build
docker compose up -d
```

Caddy will automatically request and install TLS certificates for both
`dfdst.ris.africa` and `api.dfdst.ris.africa` on first startup (requires
DNS to already be pointing at the server and ports 80/443 reachable).

## 5. Verify

```bash
curl -I https://dfdst.ris.africa
curl https://api.dfdst.ris.africa/health
```

Expected: `{"status":"ok","records_loaded": <n>}` from the health endpoint.

## 6. Updating / redeploying

```bash
cd /opt/dfdst
git pull
docker compose build
docker compose up -d
```

## 7. Logs & troubleshooting

```bash
docker compose logs -f caddy      # TLS/cert issues, routing
docker compose logs -f backend    # FastAPI/uvicorn errors
docker compose logs -f frontend   # nginx errors
```

Common issues:
- **Cert request fails**: DNS not propagated yet, or ports 80/443 blocked
  by the Hetzner Cloud Firewall (check the console, not just `ufw`).
- **CORS errors in browser**: `ALLOWED_ORIGINS` in `backend/.env` must
  exactly match the frontend's scheme+host (`https://dfdst.ris.africa`,
  no trailing slash).
- **403 "Invalid host header"**: `TRUSTED_HOSTS` in `backend/.env` must
  include `api.dfdst.ris.africa`.

## Notes on architecture decisions

- **Caddy** was chosen over raw nginx/certbot because it handles automatic
  HTTPS issuance and renewal with zero extra cron jobs or ACME client
  configuration — ideal for a small single-VM Hetzner deployment.
- The backend and frontend containers do **not** publish ports directly to
  the host; they're only reachable through the internal Docker network and
  proxied by Caddy. This reduces the attack surface to just 80/443.
- `VITE_*` variables are compiled into the static JS bundle at **build
  time** (not runtime), so changing `frontend/.env` after the image is
  built has no effect — you must rebuild (`docker compose build frontend`).
