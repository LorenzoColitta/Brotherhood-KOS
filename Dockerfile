# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies and copy source
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# Build step (adjust if your project doesn't use a build step)
RUN npm run build

# Runtime stage
FROM node:18-alpine AS runtime
WORKDIR /app

# Install minimal runtime tools (curl for doppler install)
RUN apk add --no-cache bash curl ca-certificates

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts and rest of the app
COPY --from=builder /app/dist ./dist
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# Ensure entrypoint is executable; entrypoint will install doppler (if token present)
# and run the app via doppler run -- npm run start:web, or fall back to npm run start:web.
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["sh", "./entrypoint.sh"]