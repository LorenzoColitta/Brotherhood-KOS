import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Capture raw body for HMAC verification
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Required envs (in Render via Doppler or Render envs)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_SHARED_SECRET = process.env.API_SHARED_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !API_SHARED_SECRET) {
  console.error('[FATAL] Missing required environment variables for API: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_SHARED_SECRET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function validSignature(rawBuf, headerSig) {
  try {
    const expected = crypto.createHmac('sha256', API_SHARED_SECRET).update(rawBuf).digest('hex');
    const expectedHeader = 'v1=' + expected;
    const a = Buffer.from(headerSig || '', 'utf8');
    const b = Buffer.from(expectedHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

// Simple rate limiting guard (very small, to avoid accidental floods)
let lastReq = 0;
const MIN_MS_BETWEEN = 20;

app.post('/api/add-kos', async (req, res) => {
  try {
    const sig = req.get('x-signature') || '';
    if (!validSignature(req.rawBody, sig)) {
      return res.status(401).json({ ok: false, error: 'invalid signature' });
    }

    // Cheap rate guard
    const now = Date.now();
    if (now - lastReq < MIN_MS_BETWEEN) {
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }
    lastReq = now;

    const { userId, target, guildId, command, timestamp } = req.body || {};
    if (!userId || !target) return res.status(400).json({ ok: false, error: 'missing fields' });

    const record = {
      user_id: userId,
      target,
      guild_id: guildId || null,
      command: command || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('kos').insert([record]);
    if (error) {
      console.error('[API] Supabase insert error:', error);
      return res.status(500).json({ ok: false, error: 'db_error' });
    }

    return res.json({ ok: true, message: 'Added', data });
  } catch (err) {
    console.error('[API] server error:', err?.stack || err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'brotherhood-kos-api', uptime: process.uptime() });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.info(`[API] listening on ${PORT}`);
});
