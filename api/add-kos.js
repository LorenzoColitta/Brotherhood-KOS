// Vercel serverless function: /api/add-kos
// Verifies HMAC (X-Signature: v1=<hex>) and inserts a row into Supabase via the REST API.
// Required environment variables (in Vercel project settings):
// - SUPABASE_URL (e.g. https://xyz.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (service_role key - keep only on server)
// - API_SHARED_SECRET (HMAC secret used by the bot)

async function getRawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const API_SHARED_SECRET = process.env.API_SHARED_SECRET;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !API_SHARED_SECRET) {
        console.error('[API] missing envs');
        return res.status(500).json({ ok: false, error: 'server_misconfigured' });
    }

    let raw;
    try {
        raw = await getRawBody(req);
    } catch (err) {
        console.error('[API] failed to read raw body', err);
        return res.status(400).json({ ok: false, error: 'invalid_body' });
    }

    const sigHeader = (req.headers['x-signature'] || '').toString();

    // Verify HMAC signature
    try {
        const crypto = await import('crypto');
        const expected = crypto.createHmac('sha256', API_SHARED_SECRET).update(raw).digest('hex');
        const expectedHeader = 'v1=' + expected;
        const a = Buffer.from(sigHeader || '', 'utf8');
        const b = Buffer.from(expectedHeader, 'utf8');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            console.warn('[API] invalid signature');
            return res.status(401).json({ ok: false, error: 'invalid_signature' });
        }
    } catch (err) {
        console.error('[API] signature verification failed', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }

    let body;
    try {
        body = JSON.parse(raw.toString('utf8'));
    } catch (err) {
        console.error('[API] invalid json', err);
        return res.status(400).json({ ok: false, error: 'invalid_json' });
    }

    const { userId, target, guildId, command } = body || {};
    if (!userId || !target) return res.status(400).json({ ok: false, error: 'missing_fields' });

    // Insert via Supabase REST API: POST to /rest/v1/kos
    const insertUrl = new URL('/rest/v1/kos', SUPABASE_URL).toString();

    try {
        const fetch = (await import('node-fetch')).default;
        const payload = [{
            user_id: userId,
            target,
            guild_id: guildId || null,
            command: command || null,
            created_at: new Date().toISOString()
        }];

        const resp = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // For Supabase REST, Authorization and apikey should both be the service_role key
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });

        const text = await resp.text();
        if (resp.status >= 200 && resp.status < 300) {
            let data;
            try { data = JSON.parse(text); } catch { data = text; }
            return res.status(200).json({ ok: true, message: 'Added', data });
        } else {
            console.error('[API] Supabase returned non-2xx', resp.status, text);
            return res.status(502).json({ ok: false, error: 'db_error', status: resp.status, body: text });
        }
    } catch (err) {
        console.error('[API] insertion failed', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
}