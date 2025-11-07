# Brotherhood-KOS

A comprehensive Kill On Sight (KOS) management system for the Brotherhood Discord server, built with Discord.js, Supabase (PostgreSQL), and Cloudflare Workers.

## ✨ Features

- 🎯 **Discord Bot** - Slash commands for managing KOS entries
- 📊 **Database** - Supabase (PostgreSQL) backend with full audit trail
- 🔒 **Admin Panel** - Secure DM-based admin interface
- ⏰ **Auto-Expiry** - Automatic archival of expired entries
- 📝 **History Tracking** - Complete exit registry and audit logs
- 🔐 **Secrets Management** - Doppler integration for secure environment variables

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- A [Supabase](https://supabase.com) account and project
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- (Optional) [Doppler](https://www.doppler.com/) account for secrets management
- (Optional) [Railway](https://railway.app/) account for easy deployment

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
   - Then run `src/database/api-auth-migration.sql` for API authentication tables
   - Get your project URL and API keys (from Settings → API)

4. **Configure environment variables**
   
   **Option A: Using .env file (Traditional)**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```
   
   **Option B: Using Doppler (Recommended)**
   ```bash
   # Install and setup Doppler
   ./tools/doppler-local.sh
   # Add your secrets to Doppler dashboard
   ```

5. **Set admin password**
   ```bash
   # With .env
   npm run set-admin-password
   
   # With Doppler (ADMIN_PASSWORD should be set in Doppler)
   npm run set-admin:doppler
   ```

6. **Deploy Discord commands**
   ```bash
   # With .env
   npm run deploy-commands
   
   # With Doppler
   npm run deploy-commands:doppler
   ```

7. **Start the bot**
   ```bash
   # With .env
   npm start
   
   # With Doppler
   npm run start:doppler
   ```

8. **Start the API (optional)**
   ```bash
   # With .env
   npm run start:api
   
   # With Doppler
   npm run start:api:doppler
   ```

## 📋 Available Commands

### Discord Bot Commands

- `/add <username> <reason> [duration]` - Add a player to the KOS list
- `/remove <username>` - Remove a player from the KOS list
- `/list [filter]` - View the KOS list with pagination
- `/status` - View bot status and statistics
- `/console` - Generate an authentication code for API access
- `/manage` - Admin panel for bot management (requires password)

### NPM Scripts

```bash
# Bot scripts
npm start                    # Start the Discord bot
npm run deploy-commands      # Deploy Discord slash commands
npm run set-admin-password   # Set admin password interactively

# API scripts
npm run start:api            # Start the REST API server

# Doppler scripts (recommended)
npm run start:doppler        # Start bot with Doppler secrets
npm run start:api:doppler    # Start API with Doppler secrets
npm run deploy-commands:doppler
npm run set-admin:doppler
```


## 🔧 Configuration

### Required Environment Variables

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
API_SECRET_KEY=your_generated_secret_key
```

### Optional Environment Variables

```env
DISCORD_GUILD_ID=your_guild_id                    # For faster command deployment
ADMIN_PASSWORD=your_admin_password                # For automated admin setup
API_PORT=3000                                     # API server port (default: 3000)
NODE_ENV=production
```

See `.env.example` for a complete template.

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment instructions for all components
- **[RAILWAY.md](./RAILWAY.md)** - Deploy to Railway platform (recommended for beginners)
- **[DOPPLER.md](./DOPPLER.md)** - Secrets management with Doppler integration
- **[IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md)** - Development notes

## 🏗️ Deployment Options

### Bot Deployment

#### Option 1: Railway (Easiest)

Railway provides one-click deployment with automatic builds:

```bash
# 1. Push to GitHub
# 2. Connect repository to Railway
# 3. Set environment variables in Railway dashboard
# 4. Deploy!
```

See [RAILWAY.md](./RAILWAY.md) for detailed instructions.

#### Option 2: Traditional VPS/Server

Use PM2 for process management:

```bash
npm install -g pm2
pm2 start src/bot/index.js --name brotherhood-kos
pm2 startup
pm2 save
```

### API Deployment

#### Option 1: Cloudflare Builds (Recommended)

Automatic deployment on git push with no manual wrangler steps:

1. Connect your GitHub repository to Cloudflare Builds
2. Configure runtime secrets in Cloudflare Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `API_SECRET_KEY`
3. Push to main branch - automatic deployment!

See [CLOUDFLARE-BUILDS-INSTRUCTIONS.md](./CLOUDFLARE-BUILDS-INSTRUCTIONS.md) for complete setup guide.

#### Option 2: Traditional Server (Node.js/Express)

Deploy alongside the bot or on a separate server:

```bash
npm run start:api
```

For production with PM2:

```bash
pm2 start src/api/server.js --name brotherhood-kos-api
```

## 🏛️ Architecture

```
Brotherhood-KOS/
├── src/
│   ├── worker.js         # Cloudflare Worker (Builds deployment)
│   ├── api/              # API implementations
│   │   ├── server.js     # Express.js server (Node.js)
│   │   ├── worker-full.js # Legacy Cloudflare Worker (full API)
│   │   └── worker-readonly.js # Legacy read-only worker
│   ├── bot/              # Discord bot
│   │   ├── commands/     # Slash command implementations
│   │   └── events/       # Discord event handlers
│   ├── config/           # Configuration management
│   ├── database/         # Supabase connection & schema
│   ├── services/         # Business logic services
│   └── utils/            # Utility functions
├── scripts/              # Maintenance scripts
├── tools/                # Development tools
└── .github/workflows/    # CI/CD automation
```

## 🔒 Security

- Admin passwords are hashed using SHA-256
- Service role key is only used server-side
- Worker uses anonymous key for read-only operations
- Admin sessions expire after 24 hours
- All secrets managed via Doppler or `.env` (never committed)
- GitHub Actions workflow for secure CI/CD

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 Check the [documentation](./DEPLOYMENT.md)
- 🐛 [Report bugs](https://github.com/LorenzoColitta/Brotherhood-KOS/issues)
- 💬 [Discussions](https://github.com/LorenzoColitta/Brotherhood-KOS/discussions)
- 📧 Contact the maintainers

## 🙏 Acknowledgments

- Built with [Discord.js](https://discord.js.org/)
- Database powered by [Supabase](https://supabase.com/)
- API hosted on [Cloudflare Workers](https://workers.cloudflare.com/)
- Secrets managed with [Doppler](https://www.doppler.com/)
- Easy deployment via [Railway](https://railway.app/)

---

**Made with ❤️ for the Brotherhood community**
 

