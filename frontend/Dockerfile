FROM node:26.13.1-trixie-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build
WORKDIR /app
RUN npm install --global pnpm@12.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN pnpm --filter @eva/frontend install --frozen-lockfile
COPY backend/reference.ts backend/
COPY frontend frontend/
RUN pnpm --filter @eva/frontend exec vite build

FROM caddy:2.11.9-alpine@sha256:0bbb055bda6793c999bde78b1b5ce3e89f829fb031af2cf50056ea1246559fee
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
ENV XDG_CONFIG_HOME=/tmp XDG_DATA_HOME=/tmp EVA_MODE=testnet
USER 10001:10001
