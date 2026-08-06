# Digital Fertilizer Decision Support Tool Frontend

Split screen analytical interface for soil sample intelligence. Left panel
houses the advanced filter accordion and the AG Grid data table. Right panel
houses the interactive vector map, synchronized to the active filters and
grid selection through shared React state in App.jsx.

## Local Development

```
cd frontend
npm install
npm run dev
```

Open http://localhost:8086 in your browser.

The dev server proxies /api requests to the backend at
http://localhost:8087 by default. Override with VITE_PROXY_TARGET.

Copy .env.example to .env.local to configure VITE_API_BASE_URL and
VITE_MAP_STYLE_URL for your environment. The map runs on the free,
API-key-free MapLibre GL JS engine using the OpenFreeMap Positron style —
no billing, no rate limits, safe for large-scale public deployments.

## Production Build

```
npm run build
npm run preview
```

## Docker

```
docker build -t digital-fertilizer-decision-support-tool .
docker run -p 8086:8086 digital-fertilizer-decision-support-tool
```

Open http://localhost:8086 in your browser.

## Style Manual Compliance

Institutional palette only: Deep Slate #1E293B, Charcoal #334155, Emerald
#059669 for optimal agronomic readings, and alert red #DC2626 for values
outside the optimal band. No purple or indigo hues. Flat, dense layout with
minimal border radius, mirroring the GLOMIP scannable data grid aesthetic.
