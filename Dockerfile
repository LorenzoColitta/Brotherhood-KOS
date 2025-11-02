# Use Node 18 Alpine for a lightweight image
FROM node:18-alpine

# Install necessary tools and keep gnupg for signature verification
RUN apk add --no-cache bash curl gnupg

WORKDIR /app

# Install dependencies (adjust as needed)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app sources and build (if you have a build step)
COPY . .

# Install Doppler CLI once during image build so we don't curl on every start
RUN curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Expose port (if your app uses one)
EXPOSE 3000

# Start the app using Doppler to inject secrets at runtime.
# The DOPPLER_SERVICE_TOKEN must be set in Railway Variables.
CMD ["bash", "-lc", "doppler run --token \"$DOPPLER_SERVICE_TOKEN\" -- npm start"]
