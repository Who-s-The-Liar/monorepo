FROM rust:1.86-slim

SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    clang \
    make \
    curl \
    git \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Add WASM target for Linera contract compilation
RUN rustup target add wasm32-unknown-unknown

# Install Linera service tools (using 0.15.8 to match Cargo.toml)
RUN cargo install --locked linera-service@0.15.8

# Install Node.js via nvm and pnpm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.40.3/install.sh | bash \
    && . ~/.nvm/nvm.sh \
    && nvm install lts/krypton \
    && npm install -g pnpm

WORKDIR /build

HEALTHCHECK CMD ["curl", "-s", "http://localhost:5173"]

ENTRYPOINT bash /build/run.bash
