# Cloudflare Builds Deployment Guide

## Overview

The Brotherhood KOS Worker can be deployed to Cloudflare using **Cloudflare Builds**, which provides automatic deployment on git push with no manual wrangler authentication or CI/CD complexity.

## What is Cloudflare Builds?

Cloudflare Builds is an automated deployment service that:
- **Automatically builds and deploys** your Worker when you push to your main branch
- **Eliminates CI/CD authentication issues** - no need for wrangler tokens in GitHub Actions
- **Manages runtime secrets** securely in the Cloudflare Dashboard
- **Provides edge deployment** with global CDN and automatic scaling
- **Requires no local wrangler setup** for deployment (though useful for local dev)

## Architecture

### Current Worker Implementation

**File**: `src/worker.js`

The Worker provides a simple API with x-api-key authentication:

- **GET /health** - Health check (no authentication)
- **GET /messages** - List messages (requires x-api-key)
- **POST /messages** - Create a message (requires x-api-key)

**Runtime Secrets** (configured in Cloudflare Dashboard):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `API_SECRET_KEY` - Your custom API secret for x-api-key authentication

## Cloudflare Builds Setup

### Prerequisites

1. A Cloudflare account (free tier works)
2. GitHub repository access
3. Supabase project with database set up

### Step 1: Connect Repository to Cloudflare Builds

See the complete guide: [CLOUDFLARE-BUILDS-INSTRUCTIONS.md](./CLOUDFLARE-BUILDS-INSTRUCTIONS.md)

Quick overview:
1. Go to Cloudflare Dashboard → Workers & Pages
2. Click "Create Application" → "Pages" → "Connect to Git"
3. Authorize Cloudflare to access your GitHub
4. Select your repository
5. Configure build settings:
   - **Production branch**: `main`
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `dist`

### Step 2: Configure Runtime Environment Variables

After connecting the repository:

1. Go to your Worker's settings in Cloudflare Dashboard
2. Navigate to Settings → Environment Variables
3. Add these secrets (mark as "Encrypted"):

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `API_SECRET_KEY` | Your custom API authentication key | Generate with `openssl rand -hex 32` |

### Step 3: Update Account ID

1. Find your Cloudflare Account ID in the dashboard
2. Edit `wrangler.toml` in your repository
3. Replace `REPLACE_WITH_ACCOUNT_ID` with your actual account ID
4. Commit and push

### Step 4: Deploy

Push your changes to the main branch:

```bash
git push origin main
```

Cloudflare Builds will automatically:
1. Clone your repository
2. Run `npm ci && npm run build`
3. Deploy the built Worker to the edge
4. Inject your runtime secrets

Monitor the deployment in: Cloudflare Dashboard → Workers & Pages → Your Worker → Deployments

### Step 5: Test Deployment

Once deployed, test your Worker:

```bash
# Health check (no authentication)
curl https://your-worker.workers.dev/health

# List messages (requires x-api-key)
curl -H "x-api-key: YOUR_API_SECRET_KEY" \
     https://your-worker.workers.dev/messages

# Create a message (requires x-api-key)
curl -X POST https://your-worker.workers.dev/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"content": "Hello from API", "author": "TestUser"}'
```

## Local Development

For local testing, you can still use wrangler:

### Install Wrangler (Optional for Local Dev)

```bash
npm install -g wrangler
# or
npx wrangler --version
```

### Local Development Server

```bash
# Start local dev server
wrangler dev

# Or using npm script
npm run dev
```

This starts a local server at `http://localhost:8787`

### Create Local Environment

Create a `.dev.vars` file for local secrets:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
API_SECRET_KEY=your_api_secret_key
```

**Note**: `.dev.vars` is gitignored and only used for local development.

## Build Process

The Worker uses esbuild for bundling:

**package.json build script**:
```json
{
  "scripts": {
    "build": "esbuild src/worker.js --bundle --outfile=dist/worker.js --platform=browser --target=es2020 --minify"
  }
}
```

**wrangler.toml build configuration**:
```toml
[build]
command = "npm ci && npm run build"
```

This bundles `src/worker.js` with all dependencies into a single `dist/worker.js` file.

## CI/CD Integration

### GitHub Actions

The CI workflow (`.github/workflows/doppler-ci.yml`) has been updated to **remove** the wrangler deployment step. Cloudflare Builds now handles Worker deployments automatically.

**What changed**:
- ❌ Removed: Manual wrangler deploy step
- ❌ Removed: Secret management via wrangler CLI
- ✅ Added: Informational message about Cloudflare Builds

**Benefits**:
- No need for `CLOUDFLARE_API_TOKEN` in GitHub Secrets
- No authentication errors in CI
- Simpler workflow focused on bot deployment only

### Deployment Workflow

1. **Developer pushes to main** → GitHub Actions runs (bot commands deployment only)
2. **Cloudflare Builds triggers** → Automatic Worker build and deployment
3. **Worker deployed** → Available at your workers.dev URL

## Custom Domain (Optional)

### Via Cloudflare Dashboard

1. Go to Workers & Pages → Your Worker
2. Click "Custom Domains"
3. Add your domain (must be on Cloudflare DNS)
4. DNS records configured automatically

Example: `api.brotherhood.com` → your worker

## Configuration

### wrangler.toml

```toml
name = "brotherhood-kos-worker"
main = "dist/worker.js"
compatibility_date = "2025-11-02"
account_id = "YOUR_ACCOUNT_ID"

[build]
command = "npm ci && npm run build"
```

### package.json

```json
{
  "name": "brotherhood-kos-worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "esbuild src/worker.js --bundle --outfile=dist/worker.js --platform=browser --target=es2020 --minify",
    "dev": "wrangler dev"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  },
  "devDependencies": {
    "esbuild": "^0.17.0",
    "wrangler": "^4.45.3"
  }
}
```

## Monitoring and Logs

### View Logs in Dashboard

1. Go to Workers & Pages → Your Worker
2. Click on a deployment
3. View real-time logs and metrics

### Live Logs with Wrangler (Local)

```bash
wrangler tail
```

Or filter by status:

```bash
wrangler tail --status error
```

## Performance and Limits

### Cloudflare Workers Limits

**Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request
- 128 MB memory

**Paid Tier ($5/month):**
- 10 million requests/month included
- 50ms CPU time per request
- 128 MB memory

### Optimization

The Worker is optimized for edge deployment:
- ✅ Single bundled file (no external imports)
- ✅ Minimal dependencies (@supabase/supabase-js)
- ✅ Efficient request handling
- ✅ CORS support built-in

## Troubleshooting

### Build Fails

**Error: Module not found**
- Ensure `package.json` has all required dependencies
- Check build command: `npm ci && npm run build`

**Error: esbuild failed**
- Verify `src/worker.js` has no syntax errors
- Check import statements are correct

### Worker Returns 500 Errors

**Check environment variables**:
1. Go to Cloudflare Dashboard → Your Worker → Settings → Environment Variables
2. Verify all three secrets are set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `API_SECRET_KEY`

**Check Worker logs**:
- View logs in Cloudflare Dashboard
- Look for detailed error messages

### Authentication Fails

**401 Unauthorized errors**:
- Verify `API_SECRET_KEY` matches between Cloudflare and your requests
- Ensure you're sending `x-api-key` header (not `Authorization`)
- Check header syntax: `x-api-key: YOUR_KEY`

### Deployment Not Triggering

**Push to main doesn't deploy**:
- Check Cloudflare Dashboard → Workers & Pages → Your Worker → Settings
- Verify GitHub integration is active
- Check production branch is set to `main`

## Migration from Manual Wrangler

If you were using manual wrangler deployment:

### Before (Manual Wrangler)

```yaml
# .github/workflows/doppler-ci.yml
- name: Deploy Cloudflare Worker
  run: |
    doppler run -- npx wrangler deploy
    wrangler secret put SUPABASE_URL
    wrangler secret put SUPABASE_ANON_KEY
```

### After (Cloudflare Builds)

```yaml
# .github/workflows/doppler-ci.yml
- name: Cloudflare Builds notice
  run: |
    echo "Using Cloudflare Builds for Worker deployment."
```

**Migration Steps**:
1. ✅ Connect repository to Cloudflare Builds
2. ✅ Set runtime secrets in Cloudflare Dashboard
3. ✅ Update `wrangler.toml` with account ID
4. ✅ Remove wrangler deploy step from CI
5. ✅ Push to main - automatic deployment!

## Security Considerations

### Runtime Secrets

All secrets are managed in Cloudflare Dashboard:
- ✅ Encrypted at rest
- ✅ Never exposed to clients
- ✅ Injected at runtime only
- ✅ Not in source code or git

### Best Practices

1. **Never commit secrets** to git
2. **Use Cloudflare Dashboard** for all secret management
3. **Rotate keys periodically** (especially `API_SECRET_KEY`)
4. **Monitor logs** for suspicious activity
5. **Use HTTPS** for all API requests

## Cost Estimation

### Free Tier

With 100,000 requests/day free:
- **~3M requests/month** free
- Perfect for small to medium projects

### Paid Tier ($5/month)

If you exceed free tier:
- **10M requests included**
- **$0.50 per additional million**

### Example Usage

For a project with moderate usage:
- **Estimated**: ~100K-500K requests/month
- **Cost**: $0 (within free tier)

## Support and Resources

### Documentation

- **[Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)**
- **[Cloudflare Builds Docs](https://developers.cloudflare.com/pages/platform/builds/)**
- **[CLOUDFLARE-BUILDS-INSTRUCTIONS.md](./CLOUDFLARE-BUILDS-INSTRUCTIONS.md)** - Detailed setup guide

### Troubleshooting

- Check Worker logs in Cloudflare Dashboard
- Review build logs for deployment errors
- Verify environment variables are set correctly

### Community

- Open issues on GitHub
- Check Cloudflare Community forums
- Review Workers examples on GitHub

## Quick Reference

```bash
# Local development
npm install
npm run build        # Build Worker locally
npm run dev          # Start local dev server (wrangler dev)

# Deploy (automatic via Cloudflare Builds)
git push origin main

# View logs (requires wrangler)
wrangler tail

# Manual deploy (if needed)
wrangler deploy
```

## Comparison: Cloudflare Builds vs Manual Wrangler

| Feature | Cloudflare Builds | Manual Wrangler |
|---------|------------------|-----------------|
| Deployment | Automatic on git push | Manual command |
| CI/CD Setup | Simple (no tokens) | Complex (API tokens) |
| Secret Management | Cloudflare Dashboard | wrangler CLI |
| Build Process | Automatic | Manual or CI |
| Local Dev | wrangler dev | wrangler dev |
| Cost | Free | Free |
| Recommended For | Production | Testing/Development |

**Recommendation**: Use **Cloudflare Builds** for production deployments and `wrangler dev` for local development.

---

## Summary

Cloudflare Builds provides the easiest path to deploying Workers:

1. ✅ **Connect** repo to Cloudflare Builds
2. ✅ **Configure** runtime secrets in Dashboard
3. ✅ **Push** to main branch
4. ✅ **Done** - automatic deployment!

No wrangler authentication, no CI/CD complexity, just push and deploy.
