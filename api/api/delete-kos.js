// DELETE /api/delete-kos?id=<id>
// Deletes the KOS entry with the provided id. Requires secret auth.
// Auth: header 'x-shared-secret' must equal process.env.API_SHARED_SECRET
// Note: Supabase DELETE via REST uses query filters like id=eq.<id>

import fetch from 'node-fetch';

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export default async function handler(req, res) {
    // Accept DELETE method or POST with _method=DELETE for clients that can't send DELETE
    const method = req.method;
    if (method !== 'DELETE' && !(method === 'POST' && req.query && req.query._method === 'DELETE')) {
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

        const id = req.query && (req.query.id || (req.body && req.body.id));
        if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });

        const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/kos?id=eq.${encodeURIComponent(id)}`;

        const resp = await fetch(url, {
            method: 'DELETE',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        });

        const text = await resp.text();
        const data = (() => {
            try { return JSON.parse(text); } catch { return text; }
        })();

        if (resp.status >= 200 && resp.status < 300) {
            return res.status(200).json({ ok: true, removed: data });
        } else {
            return res.status(502).json({ ok: false, error: 'db_error', status: resp.status, body: data });
        }
    } catch (err) {
        console.error('[delete-kos] error', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
}