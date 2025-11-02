# Use Node 18 Alpine for a lightweight build
FROM node:18-alpine

# Install necessary tools and Doppler CLI
RUN apk add --no-cache bash curl gnupg \
    && curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh \
    && apk del gnupg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port (if needed for health checks or API)
EXPOSE 3000

# Run the application with Doppler to inject secrets at runtime
CMD ["doppler", "run", "--", "npm", "start"]
