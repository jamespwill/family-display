// /api/notify.js
//
// Tiny notification channel for the family dashboard.
//
//   POST /api/notify   → bumps "last updated" timestamp to now
//   GET  /api/notify   → returns the current "last updated" timestamp
//
// The PWA calls POST after logging a chore.
// The Pi dashboard polls GET and only re-fetches Airtable when the timestamp changes.

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const KEY = 'leaderboard:lastUpdated';

export default async function handler(req, res) {
  // CORS — allow the Pi (GitHub Pages) and PWA to call this from a browser
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const now = Date.now();
      await redis.set(KEY, now);
      return res.status(200).json({ ok: true, lastUpdated: now });
    }

    if (req.method === 'GET') {
      const lastUpdated = (await redis.get(KEY)) || 0;
      // Cache-Control: no-store so the Pi never sees a stale cached response
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json({ lastUpdated: Number(lastUpdated) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[notify] error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
