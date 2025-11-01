# Doppler Integration Guide

[Doppler](https://www.doppler.com/) is a secrets management platform that allows you to securely manage environment variables across local development, CI/CD, and production deployments.

## Why Doppler?

- **Centralized Secrets**: Manage all secrets in one place instead of multiple `.env` files
- **Team Collaboration**: Share secrets securely with team members
- **Environment Sync**: Automatically sync secrets across local, staging, and production
- **Audit Logs**: Track who accessed or modified secrets
- **CI/CD Integration**: Seamlessly inject secrets into GitHub Actions and deployments

## Setup Instructions

### 1. Create a Doppler Account and Project

1. Sign up for a free account at [doppler.com](https://www.doppler.com/)
2. Create a new project (e.g., "brotherhood-kos")
3. Set up environments (e.g., `dev`, `staging`, `production`)

### 2. Configure Required Secrets in Doppler

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
- `API_SECRET_KEY` - Generate a secure random key (use: `openssl rand -hex 32`)

**Admin Configuration:**
- `ADMIN_PASSWORD` - Your bot admin password (used by set-admin-password script)

**Environment:**
- `NODE_ENV` - Set to `production` or `development`

### 3. Local Development with Doppler

#### Option A: Interactive Helper Script (Recommended)

Run the interactive helper script that will guide you through setup:

```bash
./tools/doppler-local.sh
```

This script will:
- Install Doppler CLI if not present
- Help you authenticate with Doppler
- Set up your project configuration
- Provide an interactive menu to run commands with Doppler secrets

#### Option B: Manual Setup

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
   npm run start:doppler
   
   # Deploy Discord commands
   npm run deploy-commands:doppler
   
   # Set admin password (uses ADMIN_PASSWORD from Doppler)
   npm run set-admin:doppler
   
   # Deploy Cloudflare Worker
   npm run api-deploy:doppler
   ```

### 4. CI/CD Integration (GitHub Actions)

The repository includes a GitHub Actions workflow (`.github/workflows/doppler-ci.yml`) that automatically uses Doppler for CI/CD.

#### Setup GitHub Secrets

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

#### Workflow Features

The workflow automatically:
- Installs Doppler CLI
- Injects secrets from Doppler into the CI environment
- Deploys Discord commands on pushes to `main` or `develop`
- Deploys Cloudflare Worker on pushes to `main`
- Sets Worker secrets using Doppler values

### 5. Railway Integration

Railway can use Doppler secrets via service tokens:

1. Create a service token in Doppler for Railway environment
2. Add `DOPPLER_TOKEN` environment variable in Railway dashboard
3. Update start command to use Doppler:
   ```
   npm run start:doppler
   ```

See [RAILWAY.md](./RAILWAY.md) for detailed Railway + Doppler setup.

### 6. Cloudflare Worker Secrets

When deploying the Cloudflare Worker, secrets are automatically injected from Doppler:

```bash
# Deploy with Doppler
npm run api-deploy:doppler

# Or manually:
doppler run -- wrangler deploy

# Set Worker secrets from Doppler:
doppler secrets get SUPABASE_URL --plain | wrangler secret put SUPABASE_URL
doppler secrets get SUPABASE_ANON_KEY --plain | wrangler secret put SUPABASE_ANON_KEY
doppler secrets get API_SECRET_KEY --plain | wrangler secret put API_SECRET_KEY
```

## NPM Scripts for Doppler

The following npm scripts are available for Doppler integration:

```json
{
  "start:doppler": "doppler run -- node src/bot/index.js",
  "deploy-commands:doppler": "doppler run -- node src/bot/deploy-commands.js",
  "set-admin:doppler": "doppler run -- node scripts/set-admin-password.js",
  "api-deploy:doppler": "doppler run -- wrangler deploy"
}
```

## Verification Steps

1. **Test Local Development:**
   ```bash
   # Using helper script
   ./tools/doppler-local.sh
   
   # Or directly
   npm run start:doppler
   ```

2. **Test Command Deployment:**
   ```bash
   npm run deploy-commands:doppler
   ```

3. **Verify CI/CD:**
   - Push changes to `develop` or `main` branch
   - Check GitHub Actions workflow runs successfully
   - Verify secrets are injected correctly (check workflow logs)

4. **Test Worker Deployment:**
   ```bash
   npm run api-deploy:doppler
   ```

## Migration from .env to Doppler

If you're currently using `.env` files:

1. Keep your `.env.example` file for documentation
2. Import existing secrets to Doppler:
   ```bash
   doppler secrets upload .env
   ```
3. Delete local `.env` file (it's already in `.gitignore`)
4. Start using `doppler run` or npm scripts with `:doppler` suffix

## Troubleshooting

### Issue: "Doppler CLI not found"
**Solution**: Install Doppler CLI using the helper script or manual installation steps above

### Issue: "Not authenticated with Doppler"
**Solution**: Run `doppler login` or set `DOPPLER_TOKEN` environment variable

### Issue: "Project not configured"
**Solution**: Run `doppler setup` in the project directory

### Issue: "Missing secrets in Doppler"
**Solution**: Verify all required secrets are added to your Doppler project

### Issue: "CI workflow fails with authentication error"
**Solution**: Ensure `DOPPLER_TOKEN` secret is added to GitHub repository secrets

## Security Best Practices

- ✅ Use read-only service tokens for CI/CD when possible
- ✅ Rotate service tokens periodically
- ✅ Use different Doppler configs for dev/staging/production
- ✅ Never commit `.env` files or service tokens to git
- ✅ Use Doppler's audit logs to track secret access
- ✅ Limit service token permissions to required scopes only

## Advanced Features

### Environment Switching

Quickly switch between environments:

```bash
# Switch to production
doppler setup --config production

# Switch to development
doppler setup --config dev
```

### Secret Referencing

Reference secrets from other configs:

```
PRODUCTION_DB_URL=${doppler://production/DATABASE_URL}
```

### Local Overrides

Create local overrides without affecting team:

```bash
doppler secrets set DEBUG=true --config dev.local
```

## Additional Resources

- [Doppler Documentation](https://docs.doppler.com/)
- [Doppler CLI Reference](https://docs.doppler.com/docs/cli)
- [Railway Integration](https://docs.doppler.com/docs/railway)
- [GitHub Actions Integration](https://docs.doppler.com/docs/github-actions)

---

For deployment guides, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide
- [RAILWAY.md](./RAILWAY.md) - Railway-specific deployment
