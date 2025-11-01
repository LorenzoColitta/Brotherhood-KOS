# Brotherhood-KOS

A comprehensive Kill On Sight (KOS) management system for the Brotherhood Discord server, built with Discord.js, Supabase (PostgreSQL), and Cloudflare Workers.

## Features

- 🎯 **Discord Bot** - Slash commands for managing KOS entries
- 📊 **Database** - Supabase (PostgreSQL) backend with full audit trail
- 🔔 **Notifications** - Optional Telegram integration for real-time alerts
- 🌐 **Public API** - Cloudflare Worker for read-only public access
- 🔒 **Admin Panel** - Secure DM-based admin interface
- ⏰ **Auto-Expiry** - Automatic archival of expired entries
- 📝 **History Tracking** - Complete exit registry and audit logs

## Commands

- `/add <username> <reason> [duration]` - Add a player to the KOS list
- `/remove <username>` - Remove a player from the KOS list
- `/list [filter]` - View the KOS list with pagination
- `/status` - View bot status and statistics
- `/manage` - Admin panel for bot management (requires password)

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- A Supabase account and project
- A Discord bot token
- (Optional) Telegram bot token for notifications
- (Optional) Cloudflare account for Worker deployment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LorenzoColitta/Brotherhood-KOS.git
   cd Brotherhood-KOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to the SQL Editor and run `src/database/schema.sql`
   - Get your project URL, Service Role Key, and Anon Key

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials:
   - `DISCORD_TOKEN` - Your Discord bot token
   - `DISCORD_CLIENT_ID` - Your Discord application client ID
   - `DISCORD_GUILD_ID` - (Optional) Your guild ID for faster command deployment
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `API_SECRET_KEY` - Generate a secure random key
   - `TELEGRAM_BOT_TOKEN` - (Optional) Your Telegram bot token
   - `TELEGRAM_CHAT_ID` - (Optional) Your Telegram chat ID

5. **Set admin password**
   ```bash
   npm run set-admin-password
   ```

6. **Deploy Discord commands**
   ```bash
   npm run deploy-commands
   ```

7. **Start the bot**
   ```bash
   npm start
   ```

## Documentation

For detailed setup and deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## USING DOPPLER

[Doppler](https://www.doppler.com/) is a secrets management platform that allows you to securely manage environment variables across local development, CI/CD, and production deployments. This project supports Doppler integration for enhanced security and easier secret management.

### Why Doppler?

- **Centralized Secrets**: Manage all secrets in one place instead of multiple `.env` files
- **Team Collaboration**: Share secrets securely with team members
- **Environment Sync**: Automatically sync secrets across local, staging, and production
- **Audit Logs**: Track who accessed or modified secrets
- **CI/CD Integration**: Seamlessly inject secrets into GitHub Actions and deployments

### Setup Instructions

#### 1. Create a Doppler Account and Project

1. Sign up for a free account at [doppler.com](https://www.doppler.com/)
2. Create a new project (e.g., "brotherhood-kos")
3. Set up environments (e.g., `dev`, `staging`, `production`)

#### 2. Configure Required Secrets in Doppler

Add the following secrets to your Doppler project:

**Discord Configuration:**
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `DISCORD_GUILD_ID` - (Optional) Your guild ID for faster command deployment

**Supabase Configuration:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

**API Security:**
- `API_SECRET_KEY` - Generate a secure random key

**Telegram Configuration (Optional):**
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID

**Environment:**
- `NODE_ENV` - Set to `production` or `development`

#### 3. Local Development with Doppler

**Option A: Interactive Helper Script (Recommended)**

Run the interactive helper script that will guide you through setup:

```bash
./tools/doppler-local.sh
```

This script will:
- Install Doppler CLI if not present
- Help you authenticate with Doppler
- Set up your project configuration
- Provide an interactive menu to run commands with Doppler secrets

**Option B: Manual Setup**

1. **Install Doppler CLI:**
   ```bash
   # macOS
   brew install dopplerhq/tap/doppler
   
   # Linux / Codespaces
   curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
   
   # Windows
   # Download from https://docs.doppler.com/docs/install-cli
   ```

2. **Authenticate with Doppler:**
   ```bash
   doppler login
   ```

3. **Setup project in your local directory:**
   ```bash
   cd /path/to/Brotherhood-KOS
   doppler setup
   ```
   Select your project and config (e.g., `dev`, `production`)

4. **Run commands with Doppler:**
   ```bash
   # Start the bot
   doppler run -- npm start
   # OR use the npm script
   npm run start:doppler
   
   # Deploy Discord commands
   doppler run -- npm run deploy-commands
   # OR
   npm run deploy-commands:doppler
   
   # Set admin password
   doppler run -- npm run set-admin-password
   # OR
   npm run set-admin:doppler
   
   # Deploy Cloudflare Worker
   doppler run -- wrangler deploy
   # OR
   npm run api-deploy:doppler
   ```

#### 4. CI/CD Integration (GitHub Actions)

The repository includes a GitHub Actions workflow (`.github/workflows/doppler-ci.yml`) that automatically uses Doppler for CI/CD.

**Setup GitHub Secrets:**

1. In Doppler, create a **Service Token** for your CI/CD environment:
   - Go to your project settings
   - Navigate to "Access" → "Service Tokens"
   - Create a new token for your `production` or `ci` config
   - Copy the token (it starts with `dp.st.`)

2. Add secrets to your GitHub repository:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `DOPPLER_TOKEN` - The service token from Doppler
     - `CF_API_TOKEN` - Your Cloudflare API token (for Worker deployments)

**Workflow Features:**

The workflow automatically:
- Installs Doppler CLI
- Injects secrets from Doppler into the CI environment
- Deploys Discord commands on pushes to `main` or `develop`
- Deploys Cloudflare Worker on pushes to `main`
- Sets Worker secrets using Doppler values

#### 5. Cloudflare Worker Secrets

When deploying the Cloudflare Worker, secrets are automatically injected from Doppler:

```bash
# The workflow automatically runs:
doppler run -- wrangler deploy

# And sets Worker secrets:
doppler secrets get SUPABASE_URL --plain | wrangler secret put SUPABASE_URL
doppler secrets get SUPABASE_ANON_KEY --plain | wrangler secret put SUPABASE_ANON_KEY
doppler secrets get API_SECRET_KEY --plain | wrangler secret put API_SECRET_KEY
```

You can also do this manually for one-time setup:
```bash
npm run api-deploy:doppler
```

### Verification Steps

1. **Test Local Development:**
   ```bash
   # Using helper script
   ./tools/doppler-local.sh
   
   # Or directly
   doppler run -- npm start
   ```

2. **Test Command Deployment:**
   ```bash
   doppler run -- npm run deploy-commands
   ```

3. **Verify CI/CD:**
   - Push changes to `develop` or `main` branch
   - Check GitHub Actions workflow runs successfully
   - Verify secrets are injected correctly (check workflow logs)

4. **Test Worker Deployment:**
   ```bash
   doppler run -- wrangler deploy
   ```

### Troubleshooting

**Issue: "Doppler CLI not found"**
- Solution: Install Doppler CLI using the helper script or manual installation steps above

**Issue: "Not authenticated with Doppler"**
- Solution: Run `doppler login` or set `DOPPLER_TOKEN` environment variable

**Issue: "Project not configured"**
- Solution: Run `doppler setup` in the project directory

**Issue: "Missing secrets in Doppler"**
- Solution: Verify all required secrets are added to your Doppler project

**Issue: "CI workflow fails with authentication error"**
- Solution: Ensure `DOPPLER_TOKEN` secret is added to GitHub repository secrets

### Migration from .env to Doppler

If you're currently using `.env` files:

1. Keep your `.env.example` file for documentation
2. Import existing secrets to Doppler:
   ```bash
   doppler secrets upload .env
   ```
3. Delete local `.env` file (it's already in `.gitignore`)
4. Start using `doppler run` for all commands

### Security Best Practices

- ✅ Use read-only service tokens for CI/CD when possible
- ✅ Rotate service tokens periodically
- ✅ Use different Doppler configs for dev/staging/production
- ✅ Never commit `.env` files or service tokens to git
- ✅ Use Doppler's audit logs to track secret access
- ✅ Limit service token permissions to required scopes only

## Architecture

- **Bot** - Discord.js bot with slash commands and interactive flows
- **Database** - Supabase PostgreSQL with tables for entries, history, logs, and config
- **Services** - Modular services for KOS management, Roblox API, Telegram, and admin
- **API** - Cloudflare Worker for public read-only access
- **Admin** - Secure password-based authentication with session management

## Project Structure

```
Brotherhood-KOS/
├── src/
│   ├── api/
│   │   └── worker.js          # Cloudflare Worker API
│   ├── bot/
│   │   ├── commands/          # Slash command implementations
│   │   ├── events/            # Discord event handlers
│   │   ├── index.js           # Bot entry point
│   │   └── deploy-commands.js # Command deployment script
│   ├── config/
│   │   └── config.js          # Configuration management
│   ├── database/
│   │   ├── connection.js      # Supabase client initialization
│   │   └── schema.sql         # Database schema
│   ├── services/
│   │   ├── admin.service.js   # Admin authentication
│   │   ├── kos.service.js     # KOS entry management
│   │   ├── roblox.service.js  # Roblox API integration
│   │   └── telegram.service.js # Telegram notifications
│   └── utils/
│       └── logger.js          # Logging utility
├── scripts/
│   └── set-admin-password.js  # Admin password setup
├── .env.example               # Environment variables template
├── package.json               # Project dependencies
├── wrangler.toml             # Cloudflare Worker configuration
├── DEPLOYMENT.md             # Deployment guide
└── README.md                 # This file
```

## Security

- Admin passwords are hashed using SHA-256 before storage
- Service role key is only used server-side
- Worker uses anonymous key for read-only operations
- Admin sessions expire after 24 hours
- All secrets should be kept in `.env` (never committed)

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change. 

