# Render Deployment Guide

This guide explains how to configure and deploy the Brotherhood-KOS bot on Render with runtime Doppler injection.

## Configuration Steps

### 1. Set Up Doppler Token

In the Render dashboard for your service, add the following environment variable as a **Secret**:

- **DOPPLER_TOKEN**: Your Doppler service token (obtain from Doppler dashboard)

### 2. Optional Doppler Configuration

If needed, you can also set these environment variables in Render:

- **DOPPLER_PROJECT**: Your Doppler project name (if not using default)
- **DOPPLER_CONFIG**: Your Doppler config name (e.g., `prd`, `dev`)

### 3. Start Command

Ensure your Render service uses the following start command (this should be configured in `render.yaml`):

```bash
curl -sLf https://cli.doppler.com/install.sh | sh && doppler run -- npm run start:web
```

This command:
1. Installs the Doppler CLI at container startup
2. Runs your application with secrets injected from Doppler

### 4. Environment Variables (If Not Using Doppler)

**Only if you're not using Doppler for all secrets**, set these in the Render UI:

- **PORT**: The port your service listens on (default: 3000)
- **DISCORD_TOKEN**: Your Discord bot token
- **DISCORD_CLIENT_ID**: Your Discord application client ID
- **DISCORD_GUILD_ID**: Your Discord server (guild) ID
- **SUPABASE_URL**: Your Supabase project URL
- **SUPABASE_KEY**: Your Supabase anon/service key

### 5. Health Check

The service is configured with a health check at `/health`. Ensure your application responds to this endpoint.

### 6. Optional: Console Rate Limiting

To avoid log rate limits, you can set:

- **MAX_LOGS_PER_SEC**: Maximum console logs per second (default: 10)

Import the console wrapper at the top of your main entry point (`src/bot/index.js`) if needed:

```javascript
import './utils/consoleWrapper.js';
```

## Notes

- No secrets should be committed to the repository
- The Doppler CLI is installed at runtime, not baked into the Docker image
- All secrets are injected at runtime via Doppler or Render environment variables
- The `render.yaml` file defines the service configuration but does not contain secrets
