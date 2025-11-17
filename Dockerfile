# Multi-stage Dockerfile for Render (build Node bundle with devDeps available, runtime only prod deps)
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

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output and runtime files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]