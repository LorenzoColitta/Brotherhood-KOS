#!/usr/bin/env node
import fetch from 'node-fetch';
import crypto from 'crypto';

const [ , , url, secret ] = process.argv;
if (!url || !secret) {
  console.error('Usage: node tools/test/sign_and_post.js <url> <shared_secret>');
  process.exit(2);
}

const payload = {
  userId: 'test-user-1',
  target: 'test-target',
  guildId: 'test-guild',
  command: 'test-add',
  timestamp: Date.now()
};

const body = JSON.stringify(payload);
const sig = 'v1=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': sig
      },
      body
    });
    const text = await res.text();
    console.log('status', res.status);
    console.log('response', text);
  } catch (err) {
    console.error('request failed', err);
  }
})();
