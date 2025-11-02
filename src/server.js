import http from 'http';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Create minimal HTTP server
const server = http.createServer((req, res) => {
  // Log incoming requests
  logger.info(`HTTP ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  // Set JSON response header
  res.setHeader('Content-Type', 'application/json');

  // Handle routes
  if (req.url === '/' || req.url === '/health') {
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      service: 'brotherhood-kos-discord-bot',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({
      status: 'error',
      message: 'Not found'
    }));
  }
});

// Start server
server.listen(PORT, HOST, () => {
  logger.success(`Healthcheck server listening on http://${HOST}:${PORT}`);
  logger.info('Endpoints: / and /health');
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Received shutdown signal, closing healthcheck server...');
  server.close(() => {
    logger.info('Healthcheck server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle server errors
server.on('error', (error) => {
  logger.error('Healthcheck server error:', error.message);
  process.exit(1);
});
