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

