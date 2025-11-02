# Use Node 18 Alpine for a lightweight build
FROM node:18-alpine AS builder

# Install necessary tools
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy package files and install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy app sources
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install necessary tools
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY . .

# Expose port (if your app uses one)
EXPOSE 3000

# Start the app directly — Railway (or Doppler sync) provides secrets as env vars
CMD ["npm", "start"]
