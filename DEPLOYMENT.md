# Brotherhood-KOS Deployment Guide

This guide provides detailed instructions for deploying the Brotherhood-KOS Discord bot and associated components.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Discord Bot Setup](#discord-bot-setup)
4. [Bot Configuration](#bot-configuration)
5. [Bot Deployment](#bot-deployment)
6. [Cloudflare Worker Setup (Optional)](#cloudflare-worker-setup-optional)
7. [Telegram Integration (Optional)](#telegram-integration-optional)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **Git** for cloning the repository
- **Supabase account** (free tier is sufficient)
- **Discord Developer Account** for bot creation

### Optional

- **Cloudflare account** for Worker deployment
- **Telegram Bot** for notifications

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: Brotherhood-KOS (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for setup to complete

### 2. Run Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `src/database/schema.sql` from this repository
4. Paste into the SQL editor
5. Click "Run" to execute
6. Verify tables were created:
   - Go to **Table Editor**
   - You should see: `kos_entries`, `kos_history`, `kos_logs`, `bot_config`

### 3. Get API Credentials

1. Go to **Settings** → **API**
2. Copy the following values (you'll need them later):
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")
   - **service_role key** (under "Project API keys" - keep this secret!)

### 4. Configure Row Level Security (RLS)

For security, you may want to enable RLS on tables:

```sql
-- Enable RLS on all tables
ALTER TABLE kos_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kos_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kos_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access" ON kos_entries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON kos_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON kos_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON bot_config
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anon key read-only access for Worker
CREATE POLICY "Anon can read active entries" ON kos_entries
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anon can read history" ON kos_history
  FOR SELECT USING (true);
```

---

## Discord Bot Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter name: "Brotherhood-KOS" (or your preferred name)
4. Click "Create"

### 2. Create Bot User

1. In your application, go to the **Bot** section
2. Click "Add Bot" → "Yes, do it!"
3. Under **Privileged Gateway Intents**, enable:
   - ✅ SERVER MEMBERS INTENT (if you need member info)
   - ✅ MESSAGE CONTENT INTENT (for DM flows)
4. Click "Reset Token" and copy the token (save this securely!)

### 3. Get Application Credentials

1. Go to **OAuth2** → **General**
2. Copy your **CLIENT ID** (you'll need this)

### 4. Invite Bot to Your Server

1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Send Messages in Threads
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

### 5. Get Guild ID (Optional but Recommended)

For faster command deployment during development:

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Right-click your server icon → "Copy ID"
3. Save this as your `DISCORD_GUILD_ID`

---

## Bot Configuration

### 1. Clone Repository

```bash
git clone https://github.com/LorenzoColitta/Brotherhood-KOS.git
cd Brotherhood-KOS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_from_discord_developer_portal
DISCORD_CLIENT_ID=your_client_id_from_discord_developer_portal
DISCORD_GUILD_ID=your_guild_id_optional_but_recommended

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase
SUPABASE_ANON_KEY=your_anon_key_from_supabase

# API Security
API_SECRET_KEY=generate_a_secure_random_string_here

# Telegram Configuration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Environment
NODE_ENV=production
```

**Security Note**: 
- Never commit the `.env` file
- Generate `API_SECRET_KEY` using: `openssl rand -hex 32`
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret - it has full database access

### 4. Set Admin Password

Run the password setup script:

```bash
npm run set-admin-password
```

Follow the prompts to set a secure admin password. This password will be required to access the `/manage` command.

---

## Bot Deployment

### 1. Deploy Commands

Register slash commands with Discord:

```bash
npm run deploy-commands
```

- **With DISCORD_GUILD_ID**: Commands appear instantly in your guild
- **Without DISCORD_GUILD_ID**: Commands deploy globally (takes up to 1 hour)

### 2. Start the Bot

```bash
npm start
```

The bot should now be online! You should see:

```
[SUCCESS] Configuration validated
[INFO] Loading 5 commands...
[SUCCESS] Loaded command: add
[SUCCESS] Loaded command: remove
[SUCCESS] Loaded command: manage
[SUCCESS] Loaded command: status
[SUCCESS] Loaded command: list
...
[SUCCESS] Ready! Logged in as Brotherhood-KOS#1234
[INFO] Bot is ready to receive commands
```

### 3. Test Commands

In Discord, try:

- `/status` - Check bot status
- `/list` - View KOS list (should be empty)
- `/add username:testuser reason:test` - Add test entry
- `/list` - Verify entry appears
- `/remove username:testuser` - Remove test entry

### 4. Production Deployment

For production, use a process manager like **PM2**:

```bash
npm install -g pm2

# Start bot
pm2 start src/bot/index.js --name brotherhood-kos

# Configure to start on system boot
pm2 startup
pm2 save

# View logs
pm2 logs brotherhood-kos

# Restart bot
pm2 restart brotherhood-kos
```

---

## Cloudflare Worker Setup (Optional)

The Worker provides a public read-only API for KOS data.

### 1. Install Wrangler

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Configure Worker

Edit `wrangler.toml` if needed, or set secrets:

```bash
wrangler secret put SUPABASE_URL
# Enter: https://your-project.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Enter: your_anon_key

wrangler secret put API_SECRET_KEY
# Enter: your_api_secret_key
```

### 4. Deploy Worker

```bash
wrangler deploy
```

The Worker will be deployed to a URL like: `https://brotherhood-kos-api.your-subdomain.workers.dev`

### 5. Test Worker API

```bash
# List entries
curl https://your-worker-url.workers.dev/api/kos

# Get specific entry
curl https://your-worker-url.workers.dev/api/kos/username

# Get statistics
curl https://your-worker-url.workers.dev/api/stats

# Get history
curl https://your-worker-url.workers.dev/api/history
```

---

## Telegram Integration (Optional)

To receive notifications when KOS entries are added or removed:

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow prompts to create bot
4. Save the bot token

### 2. Get Chat ID

1. Start a chat with your bot
2. Send any message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `"chat":{"id":123456789}` in the response
5. Save this chat ID

### 3. Add to .env

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### 4. Restart Bot

```bash
pm2 restart brotherhood-kos
```

Test by adding/removing a KOS entry - you should receive a Telegram notification.

---

## Troubleshooting

### Bot Won't Start

**Error: Missing required environment variables**
- Check `.env` file exists and has all required values
- Verify no typos in variable names

**Error: Failed to login to Discord**
- Verify `DISCORD_TOKEN` is correct
- Check bot token hasn't been regenerated in Discord portal

### Database Connection Issues

**Error: Failed to connect to database**
- Verify `SUPABASE_URL` is correct (should start with `https://`)
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Ensure Supabase project is active (not paused)

### Commands Not Appearing

**Guild commands not showing**
- Verify bot has been invited with `applications.commands` scope
- Check `DISCORD_GUILD_ID` is correct
- Re-run `npm run deploy-commands`

**Global commands not showing**
- Wait up to 1 hour for propagation
- Try guild-specific deployment instead

### Permission Errors

**Bot can't send messages**
- Check bot has "Send Messages" permission in channel
- Verify bot role is high enough in role hierarchy

**Can't send DMs**
- User must have DMs enabled from server members
- Some commands require DM access (like `/manage`)

### Worker Issues

**Worker returns 500 errors**
- Check secrets are set correctly: `wrangler secret list`
- Verify `SUPABASE_ANON_KEY` has read permissions
- Check Worker logs: `wrangler tail`

### Periodic Tasks Not Running

**Expired entries not being archived**
- Bot must stay running continuously
- Check bot logs for errors
- Verify `archive_expired_kos()` function exists in database

---

## Maintenance

### Viewing Logs

```bash
# PM2 logs
pm2 logs brotherhood-kos

# Real-time logs
pm2 logs brotherhood-kos --lines 100
```

### Database Backups

Supabase automatically backs up your database. For manual backups:

1. Go to Supabase Dashboard → Settings → Database
2. Download a backup or enable point-in-time recovery

### Updating the Bot

```bash
git pull origin main
npm install
npm run deploy-commands  # If commands changed
pm2 restart brotherhood-kos
```

### Monitoring

Consider setting up:
- **Uptime monitoring** (e.g., UptimeRobot)
- **Error tracking** (e.g., Sentry)
- **Log aggregation** (e.g., Papertrail)

---

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/LorenzoColitta/Brotherhood-KOS/issues)
- Review bot logs for error messages
- Verify all configuration values are correct

---

**Important Security Reminders:**

- Never share your `SUPABASE_SERVICE_ROLE_KEY`
- Keep your Discord bot token secret
- Use strong passwords for admin access
- Regularly review database logs for suspicious activity
- Keep dependencies updated: `npm audit fix`
