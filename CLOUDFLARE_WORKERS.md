# Cloudflare Workers Deployment Guide

## Overview

The Brotherhood KOS API can be deployed to Cloudflare Workers for edge computing with global distribution, low latency, and automatic scaling.

## Architecture Options

You have two deployment options:

### Option 1: Cloudflare Workers (Recommended for Production)
- **Edge deployment** with global CDN
- **Automatic scaling** and DDoS protection
- **Low latency** worldwide
- **Cost-effective** (Free tier: 100,000 requests/day)
- Uses `src/api/worker-full.js`

### Option 2: Express Server (Node.js)
- **Traditional server** deployment
- Runs on VPS, Railway, Heroku, etc.
- Better for development and local testing
- Uses `src/api/server.js`

## Cloudflare Workers Setup

### Prerequisites

1. A Cloudflare account (free tier works)
2. Wrangler CLI installed globally
3. Supabase project with database tables set up

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

Or use npx without global installation:
```bash
npx wrangler --version
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authentication.

### Step 3: Configure Environment Variables

You need to set three secrets in Cloudflare Workers:

```bash
# Set your Supabase URL
wrangler secret put SUPABASE_URL
# Enter: https://your-project.supabase.co

# Set your Supabase Service Role Key (for write operations)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Enter: your_service_role_key_here

# Set your Supabase Anon Key (optional, for backward compatibility)
wrangler secret put SUPABASE_ANON_KEY
# Enter: your_anon_key_here
```

**Important:** The worker uses the `SERVICE_ROLE_KEY` for full database access, including write operations. Keep this key secure!

### Step 4: Deploy

Deploy the worker to Cloudflare:

```bash
# Standard deployment
wrangler deploy

# Or with Doppler
npm run api-deploy:doppler
```

### Step 5: Test Your Deployment

After deployment, Wrangler will show you the worker URL:

```
Published brotherhood-kos-api
  https://brotherhood-kos-api.your-subdomain.workers.dev
```

Test the health endpoint:

```bash
curl https://brotherhood-kos-api.your-subdomain.workers.dev/health
```

## Configuration

### wrangler.toml

The `wrangler.toml` file configures your worker:

```toml
name = "brotherhood-kos-api"
main = "src/api/worker-full.js"
compatibility_date = "2024-01-01"

[vars]
# Non-sensitive variables can go here
```

### Environment Variables

Secrets (sensitive data) are set via `wrangler secret put` and are encrypted at rest. They're available in the worker via the `env` object.

**Required Secrets:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for write operations

**Optional Secrets:**
- `SUPABASE_ANON_KEY` - Anon key (for backward compatibility)

## Custom Domain (Optional)

### Via Cloudflare Dashboard

1. Go to Workers & Pages → Your Worker
2. Click "Custom Domains"
3. Add your domain (must be on Cloudflare)
4. DNS records are configured automatically

Example: `api.brotherhood.com` → your worker

### Update API Base URL

Once you have a custom domain, update your API documentation and clients to use:

```
https://api.brotherhood.com
```

Instead of:

```
https://brotherhood-kos-api.your-subdomain.workers.dev
```

## Usage with Discord Bot

The Discord bot's `/console` command works with both deployment options:

1. User runs `/console` in Discord
2. Bot generates auth code (stored in Supabase)
3. User exchanges code for token via your API (CF Worker or Express)
4. User makes authenticated API requests

The authentication flow is the same regardless of deployment method!

## Monitoring and Logs

### View Logs

Stream live logs from your worker:

```bash
wrangler tail
```

Or view logs with filters:

```bash
wrangler tail --status error
```

### Cloudflare Dashboard

View analytics, logs, and metrics:
1. Go to Workers & Pages
2. Select your worker
3. Check metrics, logs, and settings

## Performance Considerations

### Cloudflare Workers Limits

**Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request
- 128 MB memory

**Paid Tier ($5/month):**
- 10 million requests/month included
- 50ms CPU time per request
- 128 MB memory

### Optimization Tips

1. **Caching:** The worker doesn't cache by default. Implement caching for frequently accessed data if needed.

2. **Database Queries:** Minimize the number of Supabase queries per request.

3. **Async Operations:** Use fire-and-forget for non-critical operations (like updating `last_used_at`).

## Comparison: Workers vs Express Server

| Feature | Cloudflare Workers | Express Server |
|---------|-------------------|----------------|
| Deployment | Edge (global CDN) | Single server/region |
| Scaling | Automatic | Manual/Auto (depends on host) |
| Cold Start | ~5-10ms | ~1-2s |
| Latency | Low (edge) | Higher (single location) |
| Cost | Free tier available | VPS/hosting cost |
| Setup | Simple | More complex |
| Local Dev | Wrangler dev | npm start |
| WebSocket | No | Yes |
| Long Tasks | 50ms limit | No limit |

## Development Workflow

### Local Development

Test locally with Wrangler:

```bash
wrangler dev
```

This starts a local server at `http://localhost:8787`

### Testing

Use the same tests as the Express API:

```bash
# 1. Start local worker
wrangler dev

# 2. Run tests against localhost:8787
curl http://localhost:8787/health
```

### Deployment Workflow

```bash
# 1. Test locally
wrangler dev

# 2. Deploy to production
wrangler deploy

# 3. Monitor logs
wrangler tail
```

## Troubleshooting

### "Error: Script contains imports" 

The worker must be a single file without ES6 imports. Our `worker-full.js` is self-contained.

### "Error: Database connection failed"

Check your Supabase secrets:
```bash
wrangler secret list
```

Re-set if needed:
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### "Error: Request timeout"

Workers have a 50ms CPU time limit. Optimize database queries or upgrade to paid tier.

### "401 Unauthorized" errors

Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly. The service role key has full database access.

## Migration from Express to Workers

If you're currently using the Express server (`src/api/server.js`):

1. **Database:** No changes needed - both use Supabase
2. **Discord Bot:** No changes needed - `/console` command works the same
3. **Clients:** Update API base URL to your worker URL
4. **Code:** Deploy worker alongside Express initially, then switch

### Gradual Migration

1. Deploy worker to Cloudflare
2. Test with a few users
3. Update DNS to point to worker
4. Monitor for issues
5. Decommission Express server

## Security Considerations

### Service Role Key

The worker uses `SUPABASE_SERVICE_ROLE_KEY` for database operations. This key:

- ✅ **Is encrypted** by Cloudflare Workers secrets
- ✅ **Never exposed** to clients
- ✅ **Required** for write operations
- ⚠️ **Has full database access** - secure it carefully

### Best Practices

1. **Never commit** service role key to git
2. **Use Wrangler secrets** for all sensitive data
3. **Rotate keys** periodically
4. **Monitor logs** for suspicious activity
5. **Enable Cloudflare WAF** for additional protection

## Cost Estimation

### Free Tier (Most Cases)

With 100,000 requests/day free:
- **~3M requests/month** free
- Perfect for small to medium communities

### Paid Tier ($5/month)

If you exceed free tier:
- **10M requests included**
- **$0.50 per additional million**

### Example Costs

For a Discord server with 1,000 active users:
- Estimated: **~100K-500K requests/month**
- **Cost: $0** (well within free tier)

## Support

For issues specific to:
- **Cloudflare Workers:** [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Wrangler CLI:** [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- **This API:** Open an issue on GitHub

---

## Quick Reference

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Deploy
wrangler deploy

# View logs
wrangler tail

# Local development
wrangler dev
```

**Worker URL after deployment:**
```
https://brotherhood-kos-api.your-subdomain.workers.dev
```

**All endpoints work the same as Express API!**

See [API.md](./API.md) for complete endpoint documentation.
