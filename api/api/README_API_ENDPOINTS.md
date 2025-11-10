```text
API endpoints for Discord commands (project_root = api, functions under project_root/api)

Authentication:
- All endpoints that return or modify data require the header:
  x-shared-secret: <API_SHARED_SECRET>
  (This must exactly match the API_SHARED_SECRET env var set in Vercel.)

Endpoints:
- GET /api/get-kos
  - Query params: id, userId, target, guildId
  - Returns matching rows. Use id for single item retrieval.

- GET /api/list-kos
  - Query params: guildId (optional), limit (default 20), offset (default 0), order (e.g. created_at.desc)
  - Returns list of rows, used for list commands.

- DELETE /api/delete-kos
  - Query params: id (required)
  - Can be called with HTTP DELETE or POST with ?_method=DELETE if your client cannot send DELETE.
  - Requires x-shared-secret.

Usage from the bot:
- The bot should set header x-shared-secret = API_SHARED_SECRET (from Doppler or Vercel env)
- For add/update actions the bot should call the existing /api/add-kos (which uses HMAC signing). For convenience, reads/deletes use x-shared-secret.

Supabase:
- These functions call Supabase REST at: <SUPABASE_URL>/rest/v1/kos
- They use SUPABASE_SERVICE_ROLE_KEY for apikey and Authorization Bearer headers (server-only secret).

Security:
- Keep API_SHARED_SECRET and SUPABASE_SERVICE_ROLE_KEY server-side only.
- Rotate secrets carefully: update Vercel first, then bot.
```