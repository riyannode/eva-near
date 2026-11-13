FROM node:26.13.1-trixie-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS node-base
WORKDIR /app

FROM node-base AS deps
RUN npm install --global pnpm@12.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

FROM deps AS server-deps
RUN pnpm --filter @eva/backend install --prod --no-optional --frozen-lockfile

FROM node-base AS server
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=server-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json backend/server.ts backend/pilot.ts backend/near.ts backend/reference.ts ./backend/
ENV APP_MODE=testnet PORT=3000
USER node
CMD ["node", "backend/server.ts"]

FROM rust:1.99.1-bookworm@sha256:e6f2cff35d0f309acf8433b4f05878ed77092602c5065cc81801177da0bb3a9c AS contract
RUN rustup target add wasm32-unknown-unknown \
    && curl -fsSL --max-time 90 -o /tmp/cargo-near.tar.gz https://github.com/near/cargo-near/releases/download/cargo-near-v0.23.0/cargo-near-x86_64-unknown-linux-gnu.tar.gz \
    && echo '94008b827a457750257eced4b571c33736062cc3bd1ffda3e7af70e2bc9a4073  /tmp/cargo-near.tar.gz' | sha256sum -c - \
    && tar -xf /tmp/cargo-near.tar.gz -C /usr/local/cargo/bin --strip-components=1 --wildcards '*/cargo-near'
WORKDIR /app
COPY backend/contract backend/contract
RUN CARGO_BUILD_JOBS=8 cargo near build non-reproducible-wasm --locked --manifest-path backend/contract/Cargo.toml

FROM deps AS judge-deps
RUN pnpm --filter @eva/backend install --prod --frozen-lockfile

FROM node-base AS sandbox-binary
ADD --checksum=sha256:a0ba004218b218bd74351795e7ce2eda4a2b6af5cd3e252bd5e8bfe3c8f2e691 https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore/Linux-x86_64/2.14.0/near-sandbox.tar.gz /tmp/near-sandbox.tar.gz
RUN tar -xf /tmp/near-sandbox.tar.gz -C /usr/local/bin --strip-components=1 && /usr/local/bin/near-sandbox --version

FROM node-base AS judge
COPY --from=judge-deps /app/node_modules ./node_modules
COPY --from=judge-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json backend/server.ts backend/pilot.ts backend/near.ts backend/reference.ts backend/issuer.ts backend/sandbox.ts ./backend/
COPY --from=contract --chmod=0444 /app/backend/contract/target/near/reference.wasm ./reference.wasm
COPY --from=sandbox-binary /usr/local/bin/near-sandbox /usr/local/bin/
ENV APP_MODE=sandbox PORT=3000 NEAR_SANDBOX_BIN_PATH=/usr/local/bin/near-sandbox EVA_WASM_PATH=/app/reference.wasm
USER node
CMD ["node", "backend/server.ts"]
