# Deployment Guide

This guide covers deploying the Brotherhood-KOS system to various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Discord Bot Deployment](#discord-bot-deployment)
  - [Railway](#railway)
  - [Render](#render)
  - [Docker](#docker)
  - [VPS/Bare Metal](#vpsbaremental)
- [Cloudflare Workers Deployment](#cloudflare-workers-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)

## Prerequisites

Before deploying, ensure you have:

1. ✅ MongoDB Atlas cluster created and configured
2. ✅ Discord bot application created with token
3. ✅ All environment variables prepared
4. ✅ (Optional) Telegram bot token if using notifications
5. ✅ (Optional) Cloudflare account for API deployment

## MongoDB Atlas Setup

### 1. Create Cluster

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a new free tier (M0) cluster
3. Choose your preferred cloud provider and region

### 2. Configure Access

1. **Database Access**:
   - Create a database user
   - Set a strong password
   - Grant "Read and write to any database" role

2. **Network Access**:
   - For cloud deployments: Add `0.0.0.0/0` to allow all IPs
   - For local/VPS: Add your specific IP address

### 3. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `brotherhood-kos` (or your preferred name)

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/brotherhood-kos?retryWrites=true&w=majority
```

## Discord Bot Deployment

### Railway

Railway is recommended for its simplicity and free tier.

#### Steps

1. **Prepare Repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin update/mongo-full-impl
   ```

2. **Deploy on Railway**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js

3. **Configure Environment Variables**
   - Go to your project's Variables tab
   - Add all required environment variables from `.env.example`
   - Ensure `MONGODB_URI` is set correctly

4. **Set Start Command**
   - Railway should auto-detect `npm start`
   - If not, set custom start command: `npm start`

5. **Deploy**
   - Railway will automatically deploy on push
   - Monitor logs for any errors

#### Railway Configuration

Create `railway.json` (optional):
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Render

Render offers a generous free tier with automatic deployments.

#### Steps

1. **Prepare Repository**
   - Ensure code is pushed to GitHub

2. **Create Web Service**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name**: `brotherhood-kos-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables**
   - Add all variables from `.env.example`
   - Click "Add Environment Variable" for each

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

#### Render.yaml (Optional)

Create `render.yaml` for Infrastructure as Code:
```yaml
services:
  - type: web
    name: brotherhood-kos-bot
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: DISCORD_TOKEN
        sync: false
      - key: DISCORD_CLIENT_ID
        sync: false
      - key: MONGODB_URI
        sync: false
```

### Docker

Deploy using Docker for maximum portability.

#### Dockerfile

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "start"]
```

#### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  bot:
    build: .
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - MONGODB_URI=${MONGODB_URI}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
      - NODE_ENV=production
    env_file:
      - .env
```

#### Deploy

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### VPS/Bare Metal

Deploy on any Linux VPS (Ubuntu, Debian, etc.)

#### Steps

1. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/LorenzoColitta/Brotherhood-KOS.git
   cd Brotherhood-KOS
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

5. **Deploy Commands**
   ```bash
   npm run deploy-commands
   ```

6. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

7. **Start Bot**
   ```bash
   pm2 start src/bot/index.js --name brotherhood-kos
   pm2 save
   pm2 startup
   ```

8. **Monitor**
   ```bash
   pm2 logs brotherhood-kos
   pm2 status
   ```

#### PM2 Ecosystem File

Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'brotherhood-kos',
    script: 'src/bot/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Run with:
```bash
pm2 start ecosystem.config.cjs
```

## Cloudflare Workers Deployment

Deploy the REST API to Cloudflare's edge network.

### Prerequisites

1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`

### Steps

1. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

2. **Configure Secrets**
   ```bash
   wrangler secret put API_SECRET_KEY
   wrangler secret put MONGODB_URI
   ```

3. **Deploy Worker**
   ```bash
   npm run worker:deploy
   ```

4. **Verify Deployment**
   - Visit your worker URL (shown after deployment)
   - Test endpoint: `https://your-worker.workers.dev/stats`

### Custom Domain (Optional)

1. Add custom domain in Cloudflare dashboard
2. Update DNS records
3. Worker will be available at your custom domain

## Environment Variables

Complete list of environment variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ...` |
| `DISCORD_CLIENT_ID` | Discord application ID | `123456789012345678` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster...` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_GUILD_ID` | Guild ID for faster commands | `123456789012345678` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456:ABC-DEF...` |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | `-1001234567890` |
| `API_SECRET_KEY` | Admin API secret | `super-secret-key-here` |
| `NODE_ENV` | Environment | `production` |

## Post-Deployment

### 1. Deploy Commands

After first deployment, deploy slash commands:
```bash
npm run deploy-commands
```

### 2. Set Admin Password

Set the admin password for API access:
```bash
npm run set-admin-password your-secure-password
```

Or use the Discord command:
```
/manage setpassword your-secure-password
```

### 3. Test Bot

1. Invite bot to your Discord server
2. Try commands:
   - `/status` - Check if bot responds
   - `/add 1 "Test user"` - Add test entry
   - `/list` - View entries

### 4. Configure Telegram (Optional)

If using Telegram notifications:
1. Create a bot with @BotFather
2. Get the bot token
3. Get your chat ID (use @userinfobot)
4. Add to environment variables
5. Restart bot

### 5. Monitor Logs

#### Railway
- View logs in Railway dashboard
- Real-time log streaming available

#### Render
- View logs in Render dashboard
- Download log files available

#### PM2
```bash
pm2 logs brotherhood-kos
```

#### Docker
```bash
docker-compose logs -f
```

## Updating Deployment

### Railway/Render
- Push to GitHub
- Automatic deployment triggered

### VPS/PM2
```bash
git pull
npm install
pm2 restart brotherhood-kos
```

### Docker
```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Cloudflare Worker
```bash
npm run worker:deploy
```

## Troubleshooting

### Bot Not Starting

1. Check environment variables are set correctly
2. Verify MongoDB connection string
3. Check Discord token is valid
4. Review deployment logs

### Commands Not Working

1. Ensure commands are deployed: `npm run deploy-commands`
2. Check bot permissions in Discord
3. Verify `DISCORD_GUILD_ID` if using guild commands

### MongoDB Connection Failed

1. Verify connection string format
2. Check IP whitelist in MongoDB Atlas
3. Ensure database user has correct permissions
4. Test connection with MongoDB Compass

### Out of Memory

1. Increase memory limits in platform settings
2. For PM2: Update `max_memory_restart` in config
3. For Docker: Set memory limits in `docker-compose.yml`

## Backup and Maintenance

### Database Backups

MongoDB Atlas provides automatic backups on paid tiers. For free tier:
1. Use `mongodump` to export data
2. Schedule regular backups
3. Store backups securely

### Bot Updates

1. Test changes locally first
2. Deploy to staging environment
3. Monitor logs after deployment
4. Roll back if issues occur

## Security Best Practices

1. ✅ Never commit `.env` file
2. ✅ Use strong passwords for MongoDB
3. ✅ Rotate API keys regularly
4. ✅ Enable 2FA on all accounts
5. ✅ Monitor access logs
6. ✅ Keep dependencies updated: `npm audit fix`
7. ✅ Use HTTPS for API endpoints
8. ✅ Limit IP access where possible

## Support

If you encounter issues:
1. Check logs for error messages
2. Verify all environment variables
3. Review this deployment guide
4. Contact Brotherhood administrators
5. Open an issue on GitHub

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)
- [Discord.js Guide](https://discordjs.guide)
- [PM2 Documentation](https://pm2.keymetrics.io)
