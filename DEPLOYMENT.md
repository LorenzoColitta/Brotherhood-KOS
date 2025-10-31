# Deployment Guide

This guide covers deploying the Brotherhood KOS system to various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Discord Bot Deployment](#discord-bot-deployment)
  - [Railway](#deploying-to-railway)
  - [Render](#deploying-to-render)
  - [Heroku](#deploying-to-heroku)
- [Cloudflare Workers API](#cloudflare-workers-api)
- [Environment Variables](#environment-variables)
- [Post-Deployment Setup](#post-deployment-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

1. ✅ MongoDB Atlas cluster created and connection string ready
2. ✅ Discord bot created with token and client ID
3. ✅ (Optional) Telegram bot token and chat ID
4. ✅ (Optional) Cloudflare account for Workers
5. ✅ Git repository with the code

---

## MongoDB Atlas Setup

### 1. Create a MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (M0 Sandbox cluster is sufficient)
3. Create a new cluster (choose the free tier)

### 2. Create a Database User

1. Navigate to **Database Access** in the sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Create a username and strong password
5. Set privileges to **Read and write to any database**
6. Click **Add User**

### 3. Configure Network Access

1. Navigate to **Network Access** in the sidebar
2. Click **Add IP Address**
3. Choose **Allow Access from Anywhere** (`0.0.0.0/0`) for ease of deployment
   - ⚠️ For production, use specific IP addresses or CIDR blocks
4. Click **Confirm**

### 4. Get Your Connection String

1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `brotherhood-kos`

Example:
```
mongodb+srv://brotherhood:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/brotherhood-kos?retryWrites=true&w=majority
```

### 5. (Optional) Enable MongoDB Data API for Cloudflare Workers

1. Navigate to **App Services** in MongoDB Atlas
2. Create a new application
3. Enable **Data API**
4. Create an API key
5. Note the Data API URL and key for later

---

## Discord Bot Deployment

### Deploying to Railway

[Railway](https://railway.app) offers free hosting with generous limits.

#### Steps:

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create a new project**
   - Click **New Project**
   - Select **Deploy from GitHub repo**
   - Choose your forked `Brotherhood-KOS` repository

3. **Configure environment variables**
   - Go to **Variables** tab
   - Add all required environment variables (see [Environment Variables](#environment-variables))

4. **Configure build settings**
   - Railway should auto-detect Node.js
   - Build command: `npm install`
   - Start command: `npm start`

5. **Deploy**
   - Railway will automatically deploy on every push to main branch
   - Check logs for any errors

#### Railway Configuration File (Optional)

Create `railway.toml` in your repository root:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10
```

---

### Deploying to Render

[Render](https://render.com) offers free tier with automatic deploys.

#### Steps:

1. **Sign up for Render**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create a new Web Service**
   - Click **New +** → **Web Service**
   - Connect your GitHub repository

3. **Configure the service**
   - Name: `brotherhood-kos-bot`
   - Environment: `Node`
   - Build Command: `npm install && npm run deploy-commands`
   - Start Command: `npm start`
   - Plan: `Free`

4. **Add environment variables**
   - Click **Environment** tab
   - Add all required variables (see [Environment Variables](#environment-variables))

5. **Deploy**
   - Click **Create Web Service**
   - Render will build and deploy automatically

---

### Deploying to Heroku

[Heroku](https://heroku.com) offers free dyno hours (requires credit card verification).

#### Steps:

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**
   ```bash
   heroku create brotherhood-kos-bot
   ```

4. **Add Node.js buildpack**
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```

5. **Set environment variables**
   ```bash
   heroku config:set DISCORD_TOKEN=your_token_here
   heroku config:set DISCORD_CLIENT_ID=your_client_id
   heroku config:set MONGODB_URI=your_mongodb_uri
   # ... set all other variables
   ```

6. **Create a Procfile**
   
   Create `Procfile` in repository root:
   ```
   worker: npm start
   ```

7. **Deploy**
   ```bash
   git push heroku main
   ```

8. **Scale the worker**
   ```bash
   heroku ps:scale worker=1
   ```

---

## Cloudflare Workers API

Deploy the REST API to Cloudflare Workers for edge performance.

### Prerequisites

- Cloudflare account
- MongoDB Data API enabled (see MongoDB Atlas Setup step 5)

### Steps:

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Configure wrangler.toml**
   
   The `wrangler.toml` file is already configured. Update if needed:
   ```toml
   name = "brotherhood-kos-api"
   main = "src/api/worker.js"
   compatibility_date = "2024-01-01"
   ```

4. **Set Worker secrets**
   ```bash
   wrangler secret put API_SECRET_KEY
   wrangler secret put MONGODB_DATA_API_KEY
   wrangler secret put MONGODB_DATA_API_URL
   ```

5. **Set Worker variables (optional)**
   ```bash
   wrangler secret put MONGODB_DATABASE
   wrangler secret put MONGODB_DATASOURCE
   ```

6. **Deploy the Worker**
   ```bash
   npm run worker:deploy
   ```

7. **Test the Worker**
   ```bash
   curl https://brotherhood-kos-api.YOUR_SUBDOMAIN.workers.dev/entries
   ```

### GitHub Actions Deployment (Optional)

Create `.github/workflows/deploy-worker.yml`:

```yaml
name: Deploy Cloudflare Worker

on:
  push:
    branches: [main]
    paths:
      - 'src/api/**'
      - 'wrangler.toml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | `MTExMjM0NTY3ODk...` |
| `DISCORD_CLIENT_ID` | Discord application client ID | `1112345678901234567` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_GUILD_ID` | Discord guild ID for faster command deployment | - |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | - |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for notifications | - |
| `API_SECRET_KEY` | Secret key for API authentication | - |

### Cloudflare Workers Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_SECRET_KEY` | Secret key for admin endpoints | (same as bot) |
| `MONGODB_DATA_API_URL` | MongoDB Data API URL | `https://data.mongodb-api.com/...` |
| `MONGODB_DATA_API_KEY` | MongoDB Data API key | `xxx...` |
| `MONGODB_DATABASE` | Database name | `brotherhood-kos` |
| `MONGODB_DATASOURCE` | Data source name | `Cluster0` |

---

## Post-Deployment Setup

### 1. Set Admin Password

After deployment, run the admin password script:

**Locally:**
```bash
npm run set-admin-password
```

**On Railway/Render:**
```bash
# SSH into the container or use the web terminal
node scripts/set-admin-password.js
```

### 2. Deploy Discord Commands

If not done during build, deploy slash commands:

```bash
npm run deploy-commands
```

### 3. Test the Bot

1. Invite the bot to your Discord server
2. Run `/manage health` to check system status
3. Run `/manage test-telegram` to test Telegram notifications
4. Try adding a test KOS entry with `/add`

### 4. Configure Automatic Archival

The bot automatically archives expired entries every hour. No additional configuration needed.

To manually trigger archival:
```
/manage archive-expired
```

---

## Monitoring

### Logs

**Railway:**
- View logs in the Railway dashboard under your project

**Render:**
- View logs in the Render dashboard under **Logs** tab

**Heroku:**
```bash
heroku logs --tail
```

### Health Checks

Use the `/manage health` command to check:
- Database connection status
- Bot uptime
- Memory usage
- Telegram integration status

### MongoDB Monitoring

1. Go to MongoDB Atlas dashboard
2. Navigate to **Metrics** tab
3. Monitor:
   - Connection count
   - Operations per second
   - Storage usage

---

## Troubleshooting

### Bot Not Responding

1. **Check bot is online**
   - Verify the bot shows as online in Discord
   - Check deployment logs for errors

2. **Verify Discord token**
   - Ensure `DISCORD_TOKEN` is correct
   - Token should not have extra spaces or quotes

3. **Check slash commands are deployed**
   ```bash
   npm run deploy-commands
   ```

### Database Connection Issues

1. **Verify MongoDB URI**
   - Test connection string with MongoDB Compass
   - Ensure password is URL-encoded (replace special characters)

2. **Check IP whitelist**
   - Ensure `0.0.0.0/0` is whitelisted or add your server's IP

3. **Check database user permissions**
   - User should have read/write access to the database

### Telegram Notifications Not Working

1. **Verify bot token**
   - Test token by messaging the bot on Telegram

2. **Verify chat ID**
   - Use [@userinfobot](https://t.me/userinfobot) to get correct chat ID

3. **Run test command**
   ```
   /manage test-telegram
   ```

### Cloudflare Worker Issues

1. **Check Data API configuration**
   - Verify `MONGODB_DATA_API_URL` and `MONGODB_DATA_API_KEY`
   - Test Data API endpoint with curl

2. **Check Worker logs**
   ```bash
   wrangler tail
   ```

3. **Test locally**
   ```bash
   npm run worker:dev
   ```

### Memory Issues

If the bot crashes due to memory:

1. **Increase dyno/instance size** (may require paid plan)
2. **Optimize queries** in the code
3. **Reduce log retention**

---

## Scheduled Tasks

The bot automatically runs the following scheduled tasks:

### Expire Old Entries (Every Hour)

Automatically archives KOS entries that have passed their expiration date.

**Manual trigger:**
```
/manage archive-expired
```

**To disable automatic archival:**

Edit `src/bot/events/ready.js` and comment out the `setInterval` call.

---

## Backup and Recovery

### Database Backups

**MongoDB Atlas** (Free tier):
- Automatic daily backups (retained for 2 days)
- Manual snapshots available in the **Backup** tab

**Manual export:**
```bash
# Install MongoDB Database Tools
# https://www.mongodb.com/docs/database-tools/

# Export collection
mongoexport --uri="your_mongodb_uri" --collection=kosentries --out=kosentries.json

# Import collection
mongoimport --uri="your_mongodb_uri" --collection=kosentries --file=kosentries.json
```

---

## Scaling

### Bot Scaling

- The bot is designed to run as a single instance
- For multiple servers, consider sharding (Discord.js documentation)

### API Scaling

- Cloudflare Workers automatically scale
- No configuration needed

### Database Scaling

- Start with MongoDB Atlas M0 (free tier)
- Upgrade to M10+ for:
  - More storage
  - Better performance
  - Automatic scaling

---

## Security Best Practices

1. ✅ **Never commit secrets** to version control
2. ✅ Use environment variables for all sensitive data
3. ✅ Regularly rotate API keys and tokens
4. ✅ Use MongoDB user with least privileges
5. ✅ Enable MongoDB IP whitelisting in production
6. ✅ Keep dependencies updated (`npm audit`)
7. ✅ Monitor logs for suspicious activity

---

## Support

For deployment issues:

1. Check the logs first
2. Review this guide carefully
3. Search GitHub issues
4. Open a new issue with:
   - Deployment platform
   - Error logs
   - Steps to reproduce

---

**Happy Deploying! 🚀**