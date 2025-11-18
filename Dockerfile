# url=https://github.com/LorenzoColitta/Brotherhood-KOS/blob/main/Dockerfile
# Multi-stage Dockerfile for Render
# - build stage installs dev deps and runs the esbuild build step
# - runtime stage installs only prod deps, optionally installs Doppler CLI,
#   and runs the service under `doppler run -- npm start` when DOPPLER_TOKEN is present
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and install ALL deps (including dev deps) for build step
COPY package*.json ./
RUN npm ci

# Copy source and run the build (esbuild must be available in devDependencies)
COPY . .
RUN npm run build

# Production image: keep it small and install only prod deps
FROM node:22-alpine AS runtime
WORKDIR /app

# Install runtime utilities and Doppler CLI so we can optionally pull secrets at runtime.
# We install ca-certificates (for HTTPS), curl (installer), and bash for the install script.
RUN apk add --no-cache ca-certificates curl bash \
  && curl -sLf --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output and runtime files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Runtime environment defaults (can be overridden by Render/Doppler)
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Start: if DOPPLER_TOKEN is present the container will run under Doppler and inject secrets.
# Otherwise, it will run `npm start` directly (expects env vars set in the host / Render UI).
CMD ["sh", "-lc", "if [ -n \"$DOPPLER_TOKEN\" ]; then doppler run -- npm start; else npm start; fi"]