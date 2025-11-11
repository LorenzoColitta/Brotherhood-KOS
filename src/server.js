// Simple server wrapper for Render: imports worker (side-effects) then starts a tiny HTTP server.
// Ensure your worker's startup code (Discord client connect, etc.) is executed from ./worker.js
import './worker.js';
import http from 'http';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'brotherhood-kos-worker', uptime: process.uptime() }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');
});

server.listen(port, () => {
    console.log(`Server listening on port ${port} (PID ${process.pid})`);
});

// Graceful shutdown
function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down...`);
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forcing shutdown.');
        process.exit(1);
    }, 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));