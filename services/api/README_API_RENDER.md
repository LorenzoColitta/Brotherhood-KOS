# Brotherhood KOS API Service

## Overview

This is a minimal Express.js API service for handling HMAC-signed requests from the Brotherhood KOS Discord bot. The service receives validated requests and writes data to Supabase.

## Architecture

```
Bot (Discord.js) --[HMAC-signed POST]--> API Service (Express) --> Supabase
```

The bot signs each request with a shared secret using HMAC-SHA256. The API validates the signature before processing any request.

## Deployment on Render

### Prerequisites

1. A Render account
2. A Supabase project with the KOS database schema
3. A shared secret for HMAC signing (generate with `openssl rand -hex 32`)

### Environment Variables

Set these in Render (or via Doppler):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (not anon key)
- `API_SHARED_SECRET` - Shared secret for HMAC verification (same value used by bot)
- `PORT` - (Optional) Port to listen on (Render sets this automatically)
- `DOPPLER_TOKEN` - (Optional) If using Doppler for secrets management

### Deployment Steps

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Select the `services/api` directory as the root
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Set Environment Variables**
   - Go to the Environment tab
   - Add all required environment variables listed above

3. **Deploy**
   - Render will automatically build and deploy
   - The service will be available at `https://your-service.onrender.com`

### Using Doppler (Recommended)

If you're using Doppler for secrets management:

1. Set the `DOPPLER_TOKEN` environment variable in Render
2. The `entrypoint.sh` script will automatically:
   - Install the Doppler CLI
   - Run the service with `doppler run`
   - Inject all secrets from Doppler

### Health Check

The API provides a health check endpoint:

```bash
curl https://your-service.onrender.com/health
```

Response:
```json
{
  "status": "ok",
  "service": "brotherhood-kos-api",
  "uptime": 123.45
}
```

## API Endpoints

### POST /api/add-kos

Add a KOS entry to the database.

**Headers:**
- `Content-Type: application/json`
- `X-Signature: v1=<hmac-sha256-hex>` - HMAC signature of request body

**Request Body:**
```json
{
  "userId": "discord-user-id",
  "target": "target-identifier",
  "guildId": "discord-guild-id",
  "command": "command-name",
  "timestamp": 1234567890
}
```

**Response (Success):**
```json
{
  "ok": true,
  "message": "Added",
  "data": { ... }
}
```

**Response (Error):**
```json
{
  "ok": false,
  "error": "invalid signature|rate_limited|missing fields|db_error|server_error"
}
```

### GET /health

Health check endpoint (no authentication required).

## Security

- All POST requests require valid HMAC-SHA256 signatures
- Rate limiting: minimum 20ms between requests
- Timing-safe signature comparison to prevent timing attacks
- No secrets are stored in code or repository

## Testing

Use the test script to verify the API:

```bash
# From repository root
node tools/test/sign_and_post.js https://your-api-url/api/add-kos your-shared-secret
```

## Local Development

```bash
cd services/api
npm install

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export API_SHARED_SECRET="your-shared-secret"

# Start the server
npm start
```

## Docker

Build and run with Docker:

```bash
cd services/api
docker build -t brotherhood-kos-api .
docker run -p 3000:3000 \
  -e SUPABASE_URL="..." \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  -e API_SHARED_SECRET="..." \
  brotherhood-kos-api
```

## Troubleshooting

### API returns 401 (invalid signature)

- Verify both bot and API use the same `API_SHARED_SECRET`
- Check that the bot is computing the signature correctly
- Ensure the request body is not modified between signing and sending

### API returns 500 (db_error)

- Verify Supabase credentials are correct
- Check that the `kos` table exists in your Supabase database
- Review Supabase logs for detailed error messages

### Service won't start

- Check all required environment variables are set
- Review application logs in Render dashboard
- Verify Node.js version is 18.x or higher
