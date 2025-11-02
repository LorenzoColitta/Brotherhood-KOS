# Cloudflare Builds Setup Instructions

This guide explains how to connect your GitHub repository to Cloudflare Builds for automatic Worker deployments.

## Overview

Cloudflare Builds automatically builds and deploys your Worker whenever you push to the main branch. This eliminates the need for manual deployments and wrangler authentication in CI/CD pipelines.

## Prerequisites

- A Cloudflare account with Workers enabled
- Admin access to this GitHub repository
- Your Supabase project credentials

## Step 1: Connect Repository to Cloudflare Builds

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Overview**
3. Click **Create Application** → **Pages** → **Connect to Git**
4. Select your GitHub account and authorize Cloudflare to access your repositories
5. Choose the `Brotherhood-KOS` repository
6. Configure the build settings:
   - **Production branch**: `main`
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty for repository root)

## Step 2: Configure Runtime Environment Variables

After connecting the repository, you need to add the required runtime secrets:

1. In the Cloudflare Dashboard, go to your Worker's settings
2. Navigate to **Settings** → **Environment Variables**
3. Add the following secrets (use "Encrypt" to mark them as secrets):

   | Variable Name | Description | Example Value |
   |--------------|-------------|---------------|
   | `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
   | `API_SECRET_KEY` | Your custom API secret for x-api-key authentication | Generate a secure random string |

   **Important**: Mark all three variables as "Encrypted" to keep them secure.

## Step 3: Update Cloudflare Account ID

1. Find your Cloudflare Account ID in the dashboard (it's shown on the Workers overview page)
2. Edit `wrangler.toml` in the repository
3. Replace `REPLACE_WITH_ACCOUNT_ID` with your actual account ID:
   ```toml
   account_id = "your-actual-account-id-here"
   ```
4. Commit and push the change

## Step 4: Remove CI/CD Wrangler Steps

The GitHub Actions workflow has been updated to remove the wrangler deployment step. Cloudflare Builds will now handle all Worker deployments automatically when you push to the main branch.

**What was changed:**
- Removed the "Deploy Cloudflare Worker" step from `.github/workflows/doppler-ci.yml`
- Added a "Cloudflare Builds notice" step to inform about the new deployment method
- Removed the need for `CLOUDFLARE_API_TOKEN` secret in GitHub Actions

**No action required** - the workflow is already updated in this PR.

## Step 5: Verify Deployment

1. Merge this PR to the main branch
2. Cloudflare Builds will automatically trigger a deployment
3. Monitor the build progress in the Cloudflare Dashboard → **Workers & Pages** → Your Worker → **Deployments**
4. Once deployed, test the Worker:
   ```bash
   # Health check (no authentication)
   curl https://your-worker.workers.dev/health
   
   # List messages (requires x-api-key)
   curl -H "x-api-key: YOUR_API_SECRET_KEY" \
        https://your-worker.workers.dev/messages
   ```

## Troubleshooting

### Build fails with "Module not found"
- Ensure `package.json` includes all required dependencies
- Check that the build command is correct: `npm ci && npm run build`

### Worker returns 500 errors
- Verify all environment variables are set correctly in Cloudflare Dashboard
- Check the Worker logs in the Cloudflare Dashboard for detailed error messages

### Authentication fails
- Verify `API_SECRET_KEY` is set correctly in Cloudflare environment variables
- Ensure you're sending the `x-api-key` header with requests to protected endpoints

## API Endpoints

The Worker exposes the following endpoints:

- **GET /health** - Health check (no authentication required)
  - Returns: `{ "status": "ok", "timestamp": "..." }`

- **GET /messages** - List messages (requires x-api-key header)
  - Query params: `limit` (default 100), `offset` (default 0)
  - Returns: `{ "success": true, "messages": [...], "total": N }`

- **POST /messages** - Create a message (requires x-api-key header)
  - Body: `{ "content": "...", "author": "..." }`
  - Returns: `{ "success": true, "message": {...} }`

## Security Notes

- **Never commit secrets** to the repository
- Runtime secrets are managed in Cloudflare Dashboard, not in code
- The `x-api-key` header provides simple authentication for API access
- Use HTTPS for all API requests in production

## Support

For issues with Cloudflare Builds:
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Builds Documentation](https://developers.cloudflare.com/pages/platform/builds/)

For issues with this Worker:
- Check the GitHub repository issues
- Review the Worker logs in Cloudflare Dashboard
