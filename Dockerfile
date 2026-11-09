FROM node:22-alpine AS builder

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variables lues à la construction : elles sont écrites dans les fichiers du front.
ARG VITE_GATEWAY_BASE_URL
ARG VITE_USE_MOCKS=false
ENV VITE_GATEWAY_BASE_URL=$VITE_GATEWAY_BASE_URL VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN test -n "$VITE_GATEWAY_BASE_URL" || (echo "VITE_GATEWAY_BASE_URL est obligatoire : --build-arg VITE_GATEWAY_BASE_URL=http://<passerelle>:<port>" && exit 1)
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /src/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:8080/health || exit 1
