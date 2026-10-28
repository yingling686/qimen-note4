FROM rust:1-bookworm AS rust-build
RUN apt-get update && apt-get install -y --no-install-recommends cmake pkg-config libopus-dev && rm -rf /var/lib/apt/lists/*
ENV CMAKE_POLICY_VERSION_MINIMUM=3.5
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY vendor/zectrix-local-push-sdk ./vendor/zectrix-local-push-sdk
COPY src ./src
RUN cargo build --release --locked

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates ffmpeg fonts-noto-cjk libopus0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=rust-build /build/target/release/qimen-note4-bridge ./qimen-note4-bridge
COPY engine ./engine
COPY node ./node
COPY tools ./tools
ENV TZ=Asia/Shanghai DATA_DIR=/data NOTE4_BRIDGE=/app/qimen-note4-bridge
STOPSIGNAL SIGTERM
CMD ["node", "node/main.mjs"]
