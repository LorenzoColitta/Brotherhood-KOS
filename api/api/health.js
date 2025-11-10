// Vercel serverless function: /api/health
export default function handler(req, res) {
    res.status(200).json({ status: 'ok', service: 'brotherhood-kos-api-vercel', uptime: process.uptime?.() || 0 });
}