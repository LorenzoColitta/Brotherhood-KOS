# Use Node 22 for build compatibility with modern packages and Vercel expectation
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and install ALL deps (including dev deps) for build step
COPY package*.json ./
RUN npm ci

# Copy source and run the build (esbuild / webpack / etc. must be in deps/devDeps)
COPY . .
RUN npm run build

# Production image: keep it small and install only prod deps
FROM node:22-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output and needed runtime files from builder
# Adjust copied paths below to match your project's build output and runtime entrypoint
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/package.json ./package.json

# Expose port if your app listens (adjust if not needed)
EXPOSE 3000

# Start command: adjust if your app uses a different start script
CMD ["npm", "start"]