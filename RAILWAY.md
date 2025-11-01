# Railway Deployment Guide

This guide covers deploying the Brotherhood-KOS Discord bot to [Railway](https://railway.app/), a modern platform that makes deployment simple.

## Prerequisites

- A Railway account (sign up at [railway.app](https://railway.app/))
- A GitHub account (to connect your repository)
- Supabase project set up (see main [DEPLOYMENT.md](./DEPLOYMENT.md))
- Discord bot created (see main [DEPLOYMENT.md](./DEPLOYMENT.md))

## Why Railway?

- **Simple Deployment**: Deploy directly from GitHub
- **Automatic Builds**: Rebuilds on every push
- **Environment Variables**: Easy secret management
- **Logs & Monitoring**: Built-in logging and metrics
- **Free Tier**: Generous free tier for small bots

## Deployment Steps

### 1. Fork or Clone the Repository

If you haven't already, fork this repository to your GitHub account.

### 2. Create a New Railway Project

1. Go to [railway.app](https://railway.app/) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account
5. Select your forked `Brotherhood-KOS` repository
6. Railway will automatically detect it as a Node.js project

### 3. Configure Environment Variables

In your Railway project dashboard:

1. Click on your service
2. Go to the "Variables" tab
3. Add the following environment variables:

#### Required Variables

```
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
API_SECRET_KEY=your_generated_secret_key
NODE_ENV=production
```

#### Optional Variables

```
DISCORD_GUILD_ID=your_guild_id_for_faster_commands
ADMIN_PASSWORD=your_secure_admin_password
```

**Note**: If you set `ADMIN_PASSWORD` as an environment variable, the admin password will be set automatically on deployment without requiring manual intervention.

### 4. Deploy Discord Commands

After your first deployment, you need to register Discord slash commands:

**Option A: Using Railway CLI**

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Link your project:
   ```bash
   railway link
   ```

3. Deploy commands:
   ```bash
   railway run npm run deploy-commands
   ```

**Option B: Add to Build Process (Not Recommended)**

⚠️ **Warning**: Automatically deploying commands on every build is generally not recommended as it:
- Will deploy commands during local development with `npm install`
- Can cause rate limiting issues with Discord's API
- May deploy unintended changes

If you still want to proceed, you can add a post-deploy hook (Railway-specific):

Create a `railway.toml` file:
```toml
[deploy]
startCommand = "npm run deploy-commands && npm start"
```

This deploys commands only during Railway deployments, not local installs.

**Recommendation**: Use Option A (manual deployment via Railway CLI) for production.

### 5. Set Admin Password (if not using ADMIN_PASSWORD env var)

If you didn't set `ADMIN_PASSWORD` in environment variables:

```bash
railway run npm run set-admin-password
```

Or set it later using Doppler integration (see below).

### 6. Monitor Your Deployment

1. Go to the "Deployments" tab to see build progress
2. Check "Logs" tab for runtime logs
3. Verify bot is online in Discord

## Using Railway with Doppler

Railway integrates seamlessly with Doppler for enhanced secret management.

### Setup Doppler Integration

1. **In Doppler**:
   - Create a service token for your Railway environment
   - Go to your project → Access → Service Tokens
   - Create a token with read access

2. **In Railway**:
   - Go to your service settings
   - Add environment variable: `DOPPLER_TOKEN=dp.st.your_token_here`
   - Update your start command to use Doppler:
     ```
     npm run start:doppler
     ```

3. **Update railway.json**:
   ```json
   {
     "deploy": {
       "startCommand": "npm run start:doppler"
     }
   }
   ```

Now all secrets will be pulled from Doppler automatically!

## Railway Configuration Files

This repository includes:

- **railway.json**: Railway-specific deployment configuration
- **nixpacks.toml**: Build configuration for Nixpacks (Railway's build system)

These files ensure optimal deployment settings.

## Automatic Deployments

Railway automatically deploys when you push to your connected branch (usually `main`).

To configure:
1. Go to Service Settings → "Source"
2. Select the branch to deploy from
3. Enable/disable automatic deployments as needed

## Custom Domains (Optional)

Railway provides a default domain, but you can add a custom domain:

1. Go to Service Settings → "Domains"
2. Click "Add Custom Domain"
3. Enter your domain
4. Add the CNAME record to your DNS provider

## Scaling & Resources

Railway automatically scales resources based on usage. For the free tier:

- **RAM**: 512MB - 8GB
- **CPU**: Shared
- **Network**: Free tier includes generous limits

Monitor usage in the "Metrics" tab.

## Troubleshooting

### Bot Not Starting

**Check Logs**:
- Go to "Logs" tab in Railway
- Look for error messages

**Common Issues**:
- Missing environment variables
- Invalid Discord token
- Database connection issues

### Commands Not Appearing

1. Check if deploy-commands script ran successfully
2. Try running manually: `railway run npm run deploy-commands`
3. If using guild commands, verify `DISCORD_GUILD_ID` is correct
4. For global commands, wait up to 1 hour for propagation

### Database Connection Errors

1. Verify `SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` has correct permissions
3. Ensure Supabase project is active (not paused)

### Environment Variables Not Loading

1. Verify all required variables are set in Railway dashboard
2. Redeploy after adding new variables
3. Check for typos in variable names

## Cost Optimization

Railway's free tier is generous, but for cost optimization:

1. **Use Efficient Queries**: Optimize database calls in code
2. **Monitor Usage**: Check Metrics tab regularly
3. **Proper Shutdowns**: Implement graceful shutdowns (already done in code)
4. **Prune Logs**: Database auto-archival keeps tables lean

## Maintenance

### Viewing Logs

Railway dashboard → Service → Logs tab

### Updating the Bot

1. Push changes to your GitHub repository
2. Railway automatically rebuilds and redeploys
3. Monitor deployment in "Deployments" tab

### Database Backups

Use Supabase's built-in backup features (separate from Railway).

### Rollback

If a deployment fails:
1. Go to "Deployments" tab
2. Click on a previous successful deployment
3. Click "Redeploy"

## Support

For Railway-specific issues:
- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)

For bot issues:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md)
- Review [GitHub Issues](https://github.com/LorenzoColitta/Brotherhood-KOS/issues)

## Next Steps

After deployment:
- Test all bot commands in Discord
- Set up monitoring and alerts
- Deploy Cloudflare Worker API (optional, see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

**Security Reminders**:
- Never commit environment variables to git
- Keep Railway dashboard access secure
- Rotate secrets periodically
- Monitor logs for suspicious activity
