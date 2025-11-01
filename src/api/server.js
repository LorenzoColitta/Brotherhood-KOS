import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { verifyAuthCode, createApiSession, verifyApiSession, revokeApiSession, cleanupExpired } from '../services/auth.service.js';
import { 
  addKosEntry, 
  removeKosEntry, 
  getKosEntries, 
  getExitRegistry, 
  getStatistics, 
  getBotStatus 
} from '../services/kos.service.js';
import { getRobloxUserInfo } from '../services/roblox.service.js';
import { notifyKosAdded, notifyKosRemoved } from '../services/telegram.service.js';
import ms from 'ms';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    }
    
    const token = authHeader.substring(7);
    const session = await verifyApiSession(token);
    
    if (!session.valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session token' });
    }
    
    req.user = {
      userId: session.userId,
      username: session.username,
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Bad Request', message: 'Code is required' });
    }
    
    const authResult = await verifyAuthCode(code);
    
    if (!authResult.valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired code' });
    }
    
    // Create session
    const { token, expiresAt } = await createApiSession(authResult.userId, authResult.username);
    
    res.json({
      success: true,
      token,
      expiresAt,
      user: {
        userId: authResult.userId,
        username: authResult.username,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.substring(7);
    await revokeApiSession(token);
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// KOS endpoints
app.get('/api/kos', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const filter = req.query.filter;
    
    const { entries, total } = await getKosEntries(limit, offset);
    
    // Apply filter if provided
    let filteredEntries = entries;
    if (filter) {
      filteredEntries = entries.filter(e => 
        e.roblox_username.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    res.json({
      success: true,
      entries: filteredEntries,
      total: filter ? filteredEntries.length : total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error fetching KOS entries:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.get('/api/kos/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    
    const { entries } = await getKosEntries(1000);
    const entry = entries.find(e => e.roblox_username.toLowerCase() === username.toLowerCase());
    
    if (!entry) {
      return res.status(404).json({ error: 'Not Found', message: 'KOS entry not found' });
    }
    
    res.json({ success: true, entry });
  } catch (error) {
    logger.error('Error fetching KOS entry:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.post('/api/kos', authenticate, async (req, res) => {
  try {
    const { username, reason, duration } = req.body;
    
    if (!username || !reason) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'username and reason are required' 
      });
    }
    
    // Validate duration if provided
    let expiryDate = null;
    if (duration) {
      const durationMs = ms(duration);
      if (!durationMs || durationMs <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid duration format. Use formats like: 7d, 30d, 1y, 6mo',
        });
      }
      expiryDate = new Date(Date.now() + durationMs).toISOString();
    }
    
    // Fetch Roblox user info
    const robloxInfo = await getRobloxUserInfo(username);
    if (!robloxInfo) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Could not find Roblox user: ${username}`,
      });
    }
    
    // Add to database
    const entry = await addKosEntry({
      robloxUsername: robloxInfo.name,
      robloxUserId: robloxInfo.id,
      reason: reason,
      addedBy: req.user.username,
      addedByDiscordId: req.user.userId,
      expiryDate: expiryDate,
      thumbnailUrl: robloxInfo.thumbnailUrl,
    });
    
    // Send Telegram notification (best-effort)
    await notifyKosAdded(entry).catch(() => {});
    
    res.status(201).json({
      success: true,
      message: 'KOS entry added successfully',
      entry,
    });
  } catch (error) {
    logger.error('Error adding KOS entry:', error);
    
    if (error.message.includes('already on the KOS list')) {
      return res.status(409).json({ error: 'Conflict', message: error.message });
    }
    
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.delete('/api/kos/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check if entry exists
    const { entries } = await getKosEntries(1000);
    const entry = entries.find(e => e.roblox_username.toLowerCase() === username.toLowerCase());
    
    if (!entry) {
      return res.status(404).json({ error: 'Not Found', message: 'KOS entry not found' });
    }
    
    // Remove from database
    const removedEntry = await removeKosEntry(
      entry.roblox_username,
      req.user.username,
      req.user.userId
    );
    
    // Send Telegram notification (best-effort)
    await notifyKosRemoved(removedEntry, req.user.username).catch(() => {});
    
    res.json({
      success: true,
      message: 'KOS entry removed successfully',
      entry: removedEntry,
    });
  } catch (error) {
    logger.error('Error removing KOS entry:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// History endpoints
app.get('/api/history', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const { entries, total } = await getExitRegistry(limit, offset);
    
    res.json({
      success: true,
      entries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Statistics endpoint
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const stats = await getStatistics();
    const botStatus = await getBotStatus();
    
    res.json({
      success: true,
      statistics: {
        activeEntries: stats.activeEntries,
        historicalEntries: stats.historicalEntries,
        expiringSoon: stats.expiringSoon,
        totalProcessed: stats.activeEntries + stats.historicalEntries,
      },
      botStatus: {
        enabled: botStatus,
      },
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Status endpoint (current user info)
app.get('/api/status', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching status:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.success(`Brotherhood KOS API server running on port ${PORT}`);
  
  // Clean up expired codes and sessions on startup and every hour
  cleanupExpired();
  setInterval(cleanupExpired, 60 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
