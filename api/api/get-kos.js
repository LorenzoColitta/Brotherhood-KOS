// GET /api/get-kos? id=<id> | userId=<userId> | target=<target> | guildId=<guildId>
// Returns matching kos rows (should usually be 0 or 1 if using id)
// Auth: header 'x-shared-secret' must equal process.env.API_SHARED_SECRET

import fetch from 'node-fetch';

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    try {
        const SUPABASE_URL = requireEnv('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
        const API_SHARED_SECRET = requireEnv('API_SHARED_SECRET');

        const provided = (req.headers['x-shared-secret'] || '').toString();
        if (!provided || provided !== API_SHARED_SECRET) {
            return res.status(401).json({ ok: false, error: 'invalid_secret' });
        }

        const { id, userId, target, guildId } = req.query || {};

        const params = new URLSearchParams();
        params.set('select', '*');

        // Build filters; Supabase REST expects query params like col=eq.<value>
        if (id) params.set('id', `eq.${id}`);
        if (userId) params.set('user_id', `eq.${userId}`);
        if (target) params.set('target', `eq.${encodeURIComponent(target)}`);
        if (guildId) params.set('guild_id', `eq.${guildId}`);

        const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/kos?${params.toString()}`;

        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                Accept: 'application/json'
            }
        });

        const text = await resp.text();
        const data = (() => {
            try { return JSON.parse(text); } catch { return text; }
        })();

        if (resp.status >= 200 && resp.status < 300) {
            return res.status(200).json({ ok: true, data });
        } else {
            return res.status(502).json({ ok: false, error: 'db_error', status: resp.status, body: data });
        }
    } catch (err) {
        console.error('[get-kos] error', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
}