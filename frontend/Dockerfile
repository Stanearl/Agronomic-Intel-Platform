# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL=
ARG VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/positron
ARG VITE_SOIL_HEALTH_PMTILES_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_MAP_STYLE_URL=${VITE_MAP_STYLE_URL} \
    VITE_SOIL_HEALTH_PMTILES_URL=${VITE_SOIL_HEALTH_PMTILES_URL}

RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM nginx:1.27-alpine AS runtime

RUN addgroup -S app && adduser -S app -G app

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

RUN chown -R app:app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown app:app /var/run/nginx.pid

USER app

EXPOSE 8086

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8086/health || exit 1


CMD ["nginx", "-g", "daemon off;"]
