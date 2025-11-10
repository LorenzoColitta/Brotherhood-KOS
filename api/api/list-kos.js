// GET /api/list-kos?guildId=<guildId>&limit=20&offset=0&order=created_at.desc
// Returns a paginated list of KOS rows for a guild or global if guildId omitted.
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

        const { guildId, limit = '20', offset = '0', order = 'created_at.desc' } = req.query || {};

        const params = new URLSearchParams();
        params.set('select', '*');
        params.set('limit', String(limit));
        params.set('offset', String(offset));
        if (order) params.set('order', String(order));

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
        console.error('[list-kos] error', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
}