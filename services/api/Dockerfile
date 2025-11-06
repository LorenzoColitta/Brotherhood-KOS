# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build 2>/dev/null || true

# Runtime stage
FROM node:18-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache bash curl ca-certificates
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["sh", "entrypoint.sh"]
CMD ["node", "src/index.js"]
