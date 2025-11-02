# Use Node 18 Alpine for a lightweight build
FROM node:18-alpine

# Install necessary tools
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app sources
COPY . .

# Expose port (if your app uses one)
EXPOSE 3000

# Start the app directly — Railway (or Doppler sync) provides secrets as env vars
CMD ["npm", "start"]
