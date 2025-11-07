API (Vercel) — deployment notes

- This api/ directory contains Vercel serverless functions:
    - /api/add-kos  (POST) : accepts HMAC-signed JSON and inserts into Supabase via REST.
    - /api/health   (GET)  : simple health check.

Required environment variables (configure in Vercel Project Settings):
- SUPABASE_URL (e.g. https://xyz.supabase.co)
- SUPABASE_SERVICE_ROLE_KEY (service_role key — keep on server only)
- API_SHARED_SECRET (HMAC secret, shared with the bot)

Deploy flow:
1) Create a new Vercel Project (or import this repo) and point it to this repo/branch.
2) For initial testing, set the project to deploy from branch 'api'.
3) Add the required environment variables in the Vercel UI (mark secrets).
4) After deployment, test:
    - curl https://<your-vercel-url>/api/health
    - Use the bot or the test script to call /api/add-kos with a properly signed body.

Security and notes:
- Keep SUPABASE_SERVICE_ROLE_KEY only in Vercel environment variables.
- Ensure API_SHARED_SECRET is strong and synchronized with the bot's API_SHARED_SECRET.
- Vercel serverless functions have execution time limits — the insert to Supabase is expected to be quick.