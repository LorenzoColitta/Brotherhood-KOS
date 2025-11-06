import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = process.env.API_BASE_URL;
const API_SHARED_SECRET = process.env.API_SHARED_SECRET;

if (!API_BASE || !API_SHARED_SECRET) {
  console.error('[FATAL] Missing required environment variables: API_BASE_URL, API_SHARED_SECRET');
  process.exit(1);
}

function signBody(body) {
  return 'v1=' + crypto.createHmac('sha256', API_SHARED_SECRET).update(body).digest('hex');
}

async function hmacPost(path, payload, timeoutMs = 5000) {
  const body = JSON.stringify(payload);
  const signature = signBody(body);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'User-Agent': 'brotherhood-kos-bot/1.0'
      },
      body,
      signal: controller.signal
    });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) };
    } catch {
      return { status: res.status, body: text };
    }
  } finally {
    clearTimeout(id);
  }
}

export const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add a player to the KOS list')
  .addStringOption(option =>
    option.setName('target')
      .setDescription('Target to add to KOS list')
      .setRequired(true));

export async function execute(interaction) {
  const targetValue = interaction.options.getString('target');
  
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch((err) => {
        console.warn('Failed to defer reply:', err);
      });
    }
  } catch (err) {
    console.warn('Failed to defer reply:', err);
  }

  const payload = {
    userId: interaction.user.id,
    target: targetValue,
    guildId: interaction.guildId,
    command: 'add-kos',
    timestamp: Date.now()
  };

  try {
    const result = await hmacPost('/api/add-kos', payload, 5000);
    if (result.status >= 200 && result.status < 300) {
      await interaction.editReply({ content: result.body?.message || 'Added successfully.' });
    } else if (result.status === 401) {
      await interaction.editReply({ content: 'Authentication failed (invalid signature).' });
    } else {
      console.warn('API returned non-2xx', result);
      await interaction.editReply({ content: 'Sorry — could not complete the request (API error).' });
    }
  } catch (err) {
    console.error('API request failed', err?.stack || err);
    await interaction.editReply({ content: 'Request timed out or failed; please try again later.' });
  }
}
