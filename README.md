# Brotherhood-KOS

A comprehensive Kill On Sight (KOS) management system for the Brotherhood, featuring a Discord bot, MongoDB Atlas backend, and Cloudflare Workers REST API.

## Features

- 🤖 **Discord Bot** - Full-featured slash commands for KOS management
- 📊 **MongoDB Atlas** - Reliable cloud database with Mongoose ODM
- 🌐 **REST API** - Cloudflare Workers for public reads and admin endpoints
- 📱 **Telegram Notifications** - Optional real-time notifications for KOS changes
- 🔒 **Admin Panel** - Secure admin commands and API endpoints
- ⏰ **Auto-Archiving** - Automatic archiving of expired entries
- 📝 **History Tracking** - Complete audit trail of all KOS actions
- 🔍 **Advanced Search** - Search and filter KOS entries

## Architecture

```
┌─────────────────┐
│  Discord Bot    │
│  (Node.js)      │
└────────┬────────┘
         │
         ├─────────┐
         │         │
    ┌────▼─────┐  │
    │ MongoDB  │  │
    │  Atlas   │  │
    └────▲─────┘  │
         │        │
    ┌────┴────────▼─────┐
    │ Cloudflare Worker │
    │   (REST API)      │
    └───────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18 or higher
- MongoDB Atlas account
- Discord Bot Token
- (Optional) Telegram Bot Token
- (Optional) Cloudflare account

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

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Deploy slash commands**
   ```bash
   npm run deploy-commands
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

See `.env.example` for all required configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application client ID |
| `DISCORD_GUILD_ID` | No | Guild ID for faster command deployment |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for notifications |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID for notifications |
| `API_SECRET_KEY` | No | Secret key for admin API endpoints |

### MongoDB Setup

1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with read/write permissions
3. Whitelist your IP address (or allow all IPs for cloud deployments)
4. Get your connection string and add it to `.env`

### Discord Bot Setup

1. Create a new application at https://discord.com/developers/applications
2. Create a bot user and copy the token
3. Enable the following privileged intents:
   - Server Members Intent
   - Message Content Intent (if needed)
4. Invite the bot with the following scopes:
   - `bot`
   - `applications.commands`
5. Required bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History

## Discord Commands

### User Commands

- `/add <userid> <reason> [expires_days]` - Add a user to the KOS list
- `/remove <userid> <reason>` - Remove a user from the KOS list
- `/list [filter] [search] [limit]` - List KOS entries
- `/status` - View KOS system statistics

### Admin Commands

- `/manage setpassword <password>` - Set admin password for API access
- `/manage archive-expired` - Manually archive expired entries
- `/manage logs [level] [limit]` - View system logs

## REST API

The Cloudflare Worker provides public read endpoints and admin-protected endpoints.

### Public Endpoints

- `GET /entries?active=true&limit=100&skip=0` - List KOS entries
- `GET /entries/:robloxId` - Get specific KOS entry
- `GET /history?robloxId=<id>&limit=50` - Get KOS history
- `GET /stats` - Get KOS statistics

### Admin Endpoints

- `POST /admin/toggle-status` - Toggle KOS entry status
  - Requires `Authorization: Bearer <API_SECRET_KEY>` header
  - Body: `{ "robloxId": "123456789" }`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for:
- Railway
- Render
- Cloudflare Workers
- Other platforms

## Scripts

- `npm start` - Start the Discord bot
- `npm run dev` - Start with auto-reload (Node 18+)
- `npm run deploy-commands` - Deploy Discord slash commands
- `npm run set-admin-password` - Set admin password
- `npm run worker:dev` - Start Cloudflare Worker locally
- `npm run worker:deploy` - Deploy Cloudflare Worker

## Project Structure

```
Brotherhood-KOS/
├── src/
│   ├── api/
│   │   └── worker.js              # Cloudflare Worker API
│   ├── bot/
│   │   ├── commands/              # Discord slash commands
│   │   ├── events/                # Discord event handlers
│   │   ├── index.js               # Bot entry point
│   │   └── deploy-commands.js     # Command deployment script
│   ├── config/
│   │   └── config.js              # Configuration management
│   ├── database/
│   │   ├── models/                # Mongoose models
│   │   └── mongo-connection.js    # Database connection
│   └── services/
│       ├── admin.service.js       # Admin authentication
│       ├── kos.service.js         # KOS business logic
│       ├── roblox.service.js      # Roblox API integration
│       └── telegram.service.js    # Telegram notifications
├── scripts/
│   └── set-admin-password.js      # Admin password helper
├── .env.example                   # Environment variables template
├── package.json
├── wrangler.toml                  # Cloudflare Worker config
└── README.md
```

## Development

### Adding New Commands

1. Create a new file in `src/bot/commands/`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Optionally export `handleButton` for button interactions
4. Run `npm run deploy-commands` to register the command

### Adding New API Endpoints

1. Edit `src/api/worker.js`
2. Add route handling in the `fetch` function
3. Deploy with `npm run worker:deploy`

## Troubleshooting

### Bot doesn't respond to commands

- Ensure commands are deployed: `npm run deploy-commands`
- Check bot has proper permissions in Discord server
- Verify `DISCORD_GUILD_ID` is set for faster deployment

### MongoDB connection issues

- Verify connection string format
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

### Telegram notifications not working

- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set
- Test bot token with: `curl https://api.telegram.org/bot<TOKEN>/getMe`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Open an issue on GitHub
- Contact the Brotherhood administrators

## Acknowledgments

- Discord.js for the Discord bot framework
- Mongoose for MongoDB ODM
- Cloudflare Workers for edge computing
- Roblox API for user data 
