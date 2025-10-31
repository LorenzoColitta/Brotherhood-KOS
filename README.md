# Brotherhood KOS

A comprehensive Kill-on-Sight (KOS) system for the Brotherhood, featuring a Discord bot, MongoDB Atlas database, Cloudflare Workers REST API, and Telegram notifications.

## Features

- 🤖 **Discord Bot** with slash commands for managing KOS entries
- 🗄️ **MongoDB Atlas** for scalable, cloud-based data storage
- 🌐 **Cloudflare Workers** REST API for public read access and admin operations
- 📱 **Telegram Notifications** for real-time KOS updates
- 🔐 **Secure Admin Authentication** with hashed passwords
- ⏰ **Automatic Expiration** of time-limited KOS entries
- 📊 **Statistics and Logging** for monitoring system usage

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Discord Bot    │────▶│  MongoDB Atlas   │◀────│ Cloudflare      │
│  (Node.js)      │     │  (Database)      │     │ Workers (API)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                 │
         │                                                 │
         ▼                                                 ▼
┌─────────────────┐                              ┌─────────────────┐
│  Telegram Bot   │                              │  External Apps  │
│  (Notifications)│                              │  (Read-only)    │
└─────────────────┘                              └─────────────────┘
```

## Discord Bot Commands

### User Commands

- `/add <roblox_id> <reason> [permanent] [duration_days]` - Add a user to the KOS list
- `/remove <roblox_id> [reason]` - Remove a user from the KOS list
- `/status <roblox_id>` - Check if a user is on the KOS list
- `/list [filter]` - List KOS entries (filters: active, expiring, permanent, archived)

### Admin Commands

- `/manage stats` - View KOS statistics
- `/manage archive-expired` - Manually archive expired entries
- `/manage logs [category]` - View recent system logs
- `/manage test-telegram` - Test Telegram notification integration
- `/manage health` - Check system health and connections

## REST API Endpoints

### Public Endpoints

- `GET /entries?filter=active|expiring|permanent` - List KOS entries
- `GET /entries/:id` - Get a specific KOS entry
- `GET /history` - Get KOS history

### Admin Endpoints (require API_SECRET_KEY)

- `POST /admin/toggle-status` - Toggle entry status (requires `X-API-Key` header)

## Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account (free tier available)
- Discord Bot Token
- (Optional) Telegram Bot Token
- (Optional) Cloudflare account for Workers

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/LorenzoColitta/Brotherhood-KOS.git
   cd Brotherhood-KOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials:
   - `DISCORD_TOKEN` - Your Discord bot token
   - `DISCORD_CLIENT_ID` - Your Discord application client ID
   - `DISCORD_GUILD_ID` - (Optional) Your Discord guild ID for faster command deployment
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `API_SECRET_KEY` - Generate a secure random key for API authentication
   - (Optional) `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` for notifications

4. **Set admin password**
   ```bash
   npm run set-admin-password
   ```

5. **Deploy Discord slash commands**
   ```bash
   npm run deploy-commands
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

## Configuration

### MongoDB Atlas

1. Create a free MongoDB Atlas cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP address or use `0.0.0.0/0` for any IP (less secure)
4. Get your connection string and update `MONGODB_URI` in `.env`

### Discord Bot

1. Create a Discord application at [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a bot and copy the token
3. Enable required intents: Guilds, Guild Messages, Direct Messages
4. Invite the bot to your server with the `applications.commands` scope

### Telegram Notifications (Optional)

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
4. Update `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`

### Cloudflare Workers (Optional)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying the REST API to Cloudflare Workers.

## Development

### Run in development mode
```bash
npm run dev
```

### Deploy commands
```bash
npm run deploy-commands
```

### Test Cloudflare Worker locally
```bash
npm run worker:dev
```

## Project Structure

```
Brotherhood-KOS/
├── src/
│   ├── api/
│   │   └── worker.js           # Cloudflare Workers API
│   ├── bot/
│   │   ├── commands/           # Discord slash commands
│   │   ├── events/             # Discord event handlers
│   │   ├── deploy-commands.js  # Command deployment script
│   │   └── index.js            # Bot entry point
│   ├── config/
│   │   └── config.js           # Centralized configuration
│   ├── database/
│   │   ├── models/             # Mongoose models
│   │   └── mongo-connection.js # MongoDB connection
│   └── services/
│       ├── admin.service.js    # Admin authentication
│       ├── kos.service.js      # KOS business logic
│       ├── roblox.service.js   # Roblox API integration
│       └── telegram.service.js # Telegram notifications
├── scripts/
│   └── set-admin-password.js   # Admin password setup
├── .env.example                # Environment variables template
├── package.json                # Dependencies and scripts
├── wrangler.toml              # Cloudflare Workers config
├── README.md                  # This file
└── DEPLOYMENT.md              # Deployment guide
```

## Security

- ⚠️ **Never commit secrets** to version control
- 🔐 All passwords are hashed with SHA-256
- 🛡️ API endpoints are protected with secret keys
- 🔒 MongoDB uses encrypted connections
- 🚫 Use principle of least privilege for database users

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to:
- Railway
- Render
- Cloudflare Workers
- Other platforms

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the maintainers

## Acknowledgments

- Discord.js for the excellent Discord API wrapper
- MongoDB for providing Atlas free tier
- Cloudflare for Workers edge computing
- The Brotherhood community

---

**Made with ❤️ for the Brotherhood**
