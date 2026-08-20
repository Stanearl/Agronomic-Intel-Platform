# Deploying to Hetzner Cloud (167.235.193.135)

This project ships as two Docker images (FastAPI backend + nginx-served
React/Vite frontend) fronted by **Caddy**, which automatically provisions
and renews free HTTPS certificates (Let's Encrypt) for both domains.

- Frontend: `https://dfdst.ris.africa`
- Backend API: `https://dfdst-api.ris.africa`
- Server: `167.235.193.135`

> **Ports 80/443 are already used by another site on this server.** Caddy
> publishes directly on this project's existing convention ports — **8086**
> for the frontend, **8087** for the backend (matching `vite.config.js`,
> `frontend/Dockerfile`, and `backend/Dockerfile`) — and obtains its TLS
> certificates via the **Cloudflare DNS-01 challenge** instead of the
> standard HTTP-01 challenge, meaning it does **not** need port 80
> reachable from the internet at all. See sections 3 and 4 below for the
> Cloudflare-side configuration this requires.

## 0. DNS — do this first

You're using Cloudflare DNS for `ris.africa`. Create/confirm two DNS
records:

| Type | Name                  | Value           | Proxy status                |
|------|-----------------------|-----------------|------------------------------|
| A    | dfdst.ris.africa      | 167.235.193.135 | Proxied (orange) or DNS only |
| A    | dfdst-api.ris.africa  | 167.235.193.135 | Proxied (orange) or DNS only |

Two supported ways to reach the non-standard Caddy ports, pick one:

**Option A — Proxied (orange cloud) + Origin Rules (recommended, no port in URL)**
Cloudflare's edge always faces visitors on standard 80/443, then forwards
to your origin. Add two Cloudflare **Origin Rules** (Rules → Origin Rules):
- Match Hostname is `dfdst.ris.africa` → rewrite Destination Port to `8086`
- Match Hostname is `dfdst-api.ris.africa` → rewrite Destination Port to `8087`

This keeps clean URLs like `https://dfdst.ris.africa` for visitors while
Cloudflare talks to your origin on the correct internal port per domain.

**Option B — DNS only (grey cloud), access with explicit port**
Simpler, no Origin Rule needed, but visitors/you must include the port:
`https://dfdst.ris.africa:8086` and `https://dfdst-api.ris.africa:8087`.
No Cloudflare proxy features (caching, WAF, hiding origin IP) apply here.

Either way, no DNS or firewall change is required for certificate issuance
itself — that happens over DNS-01 (see section 3), independent of ports.

## 1. Server prerequisites (once)

SSH into the server, then:

```bash
apt-get update && apt-get install -y docker.io docker-compose-plugin git
systemctl enable --now docker
```

Firewall: only open the ports Caddy actually publishes (8086, 8087) plus
SSH. Do **not** try to open 80/443 — they belong to the other site.

```bash
ufw allow 22/tcp
ufw allow 8086/tcp
ufw allow 8087/tcp
ufw enable
```

## 2. Get the code onto the server

```bash
cd /opt
git clone https://github.com/Stanearl/Agronomic-Intel-Platform.git dfdst
cd dfdst
```

## 3. Environment files

Most env files are **committed to the repo** (no secrets — only public
domain names and non-sensitive tuning values), so `git clone`/`git pull`
already populates them:

- `backend/.env` — FastAPI settings (CORS, rate limiting, trusted hosts)
- `frontend/.env` — informational only for `npm run build` outside Docker
- `.env` (repo root) — domains, ACME email, Vite build args

**One file is NOT committed and must be created manually on the server**,
because it holds a real secret — a Cloudflare API token:

```bash
cp caddy.env.example caddy.env
nano caddy.env   # paste in your real CLOUDFLARE_API_TOKEN
```

Generate the token at **Cloudflare Dashboard → My Profile → API Tokens →
Create Token → "Edit zone DNS" template**, scoped to the `ris.africa` zone
only. Caddy uses this to complete the DNS-01 ACME challenge (it creates a
temporary `_acme-challenge` TXT record via the Cloudflare API — no port 80
involved at all).

## 4. Cloudflare Origin Rules (if using Option A above)

In the Cloudflare dashboard for `ris.africa`:
1. Go to **Rules → Origin Rules → Create rule**.
2. Rule 1 — Match: `Hostname` equals `dfdst.ris.africa`. Action:
   **Rewrite** → set **Destination Port** to `8086`.
3. Rule 2 — Match: `Hostname` equals `dfdst-api.ris.africa`. Action:
   **Rewrite** → set **Destination Port** to `8087`.
4. Save and deploy both rules.

Skip this step entirely if using Option B (DNS only / grey cloud).

## 5. Build and run

```bash
docker compose build
docker compose up -d
```

On first startup, Caddy authenticates to the Cloudflare API using
`caddy.env`'s token and requests certificates for both domains via DNS-01 —
this works immediately regardless of port 80/443 availability.

## 6. Verify

```bash
docker compose ps
curl -Ik https://dfdst.ris.africa:8086
curl -k https://dfdst-api.ris.africa:8087/health
```

(Drop the port from the URLs if you're accessing through Cloudflare's
Origin Rules from Option A — Cloudflare presents standard 443 to visitors.)

Expected health response: `{"status":"ok","records_loaded": <n>}`.

## 7. Updating / redeploying

```bash
cd /opt/dfdst
git pull
docker compose build
docker compose up -d
```

`caddy.env` is untouched by `git pull` since it's git-ignored — no need to
recreate it on subsequent deploys.

## 8. Regenerating the Soil Health PMTiles overlay

The continuous "weather-map-style" soil health interpolation layer
(rendered under the sample markers in the map view) is a pre-computed
**batch artifact**, not something the API computes per-request. It only
needs regeneration when the underlying `kisumu_pilot_soils.csv` dataset
changes (expected: a few times a month at most).

Pipeline: `kisumu_pilot_soils.csv` → `generate_soil_grid.py` (IDW
interpolation via geopandas/scipy) → `soil_health_grid.geojson` →
`tippecanoe` → `backend/data/tiles/soil-health.pmtiles`, which FastAPI
serves statically (with HTTP Range Request support) at
`https://dfdst-api.ris.africa/tiles/soil-health.pmtiles`.

On the Hetzner production server:

Because `backend/data` is baked into the image via `COPY . .` in
`backend/Dockerfile` (not bind-mounted at runtime), the generation step
runs against the **host** checkout of the repo, not inside the running
`backend` container — its output then needs a rebuild to reach
production (step 3 below).

```bash
cd /opt/dfdst

# 1. Generate the interpolated GeoJSON grid on the host, in a disposable
#    virtualenv (geopandas/scipy/shapely are intentionally isolated from
#    backend/requirements.txt — see backend/scripts/requirements.txt —
#    so they never bloat the production API image):
python3 -m venv .tiling-venv
source .tiling-venv/bin/activate
pip install --no-cache-dir -r backend/scripts/requirements.txt
python backend/scripts/generate_soil_grid.py
deactivate

# 2. Convert the GeoJSON into the PMTiles archive with tippecanoe
#    (Docker — no native install needed on the host):
mkdir -p backend/data/tiles
docker run --rm -v "$(pwd)/backend/data:/data" \
  ghcr.io/felt/tippecanoe:latest \
  tippecanoe -zg --projection=EPSG:4326 \
    -o /data/tiles/soil-health.pmtiles \
    -l soil_health \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    -f \
    /data/soil_health_grid.geojson

# 3. backend/data (including the new tiles/soil-health.pmtiles) is baked
#    into the image via `COPY . .` in backend/Dockerfile — it is NOT
#    bind-mounted at runtime — so a rebuild + restart is required for
#    the running container to pick up the new archive:
docker compose build backend
docker compose up -d backend

# 4. Confirm with a Range request:
curl -I -H "Range: bytes=0-9" https://dfdst-api.ris.africa/tiles/soil-health.pmtiles
# Expect: HTTP/2 206, with Content-Range and Accept-Ranges: bytes headers.
```

## 9. Logs & troubleshooting

```bash
docker compose logs -f caddy      # TLS/cert issues, DNS-01 challenge status
docker compose logs -f backend    # FastAPI/uvicorn errors
docker compose logs -f frontend   # nginx errors
```

Common issues:
- **Caddy fails to get a certificate**: check `caddy.env` has a valid,
  non-expired Cloudflare API token with `Zone:DNS:Edit` permission for the
  `ris.africa` zone specifically.
- **"port is already allocated" on `docker compose up`**: something else
  on the host is also bound to 8086 or 8087 — free it, or edit the `ports:`
  mapping for the `caddy` service in `docker-compose.yml`.
- **CORS errors in browser**: `ALLOWED_ORIGINS` in `backend/.env` must
  exactly match the frontend's scheme+host (`https://dfdst.ris.africa`,
  no trailing slash, no port needed — CORS is about the Origin header the
  browser sends, which reflects the URL bar, not Caddy's internal port).
- **403 "Invalid host header"**: `TRUSTED_HOSTS` in `backend/.env` must
  include `dfdst-api.ris.africa`.
- **522/523 errors from Cloudflare (Option A)**: an Origin Rule's
  destination port doesn't match 8086/8087, or the host firewall isn't
  allowing that port.

## Notes on architecture decisions

- **Caddy + Cloudflare DNS-01** was chosen specifically because ports
  80/443 are already occupied by another site on this VM. DNS-01 avoids
  needing port 80 reachable at all for ACME validation, unlike the default
  HTTP-01 challenge.
- Caddy publishes on **8086** (frontend) and **8087** (backend) to match
  this project's existing port convention everywhere else in the codebase.
- The backend and frontend containers do **not** publish ports directly to
  the host; they're only reachable through the internal Docker network and
  proxied by Caddy.
- `caddy.env` is the one deliberate exception to "commit everything" — it
  holds a real secret (Cloudflare API token) and must be created manually
  on each server from `caddy.env.example`.
- `VITE_*` variables are compiled into the static JS bundle at **build
  time** (not runtime), so changing `frontend/.env` after the image is
  built has no effect — you must rebuild (`docker compose build frontend`).
