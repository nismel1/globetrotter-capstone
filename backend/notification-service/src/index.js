// ============================================================
// GLOBETROTTER — Notification Service
// Notifications persistées + push temps réel (WebSocket).
// Utilisé par les autres services (message, group, catalog,
// recommendation, gamification...) via l'endpoint interne
// POST /internal/notifications.
//
// Événements typiques : new_message, like, comment, new_follower,
// badge_unlocked, mission_completed, group_vote, group_invitation,
// itinerary_updated, weather_alert, event_reminder.
// ============================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const http = require('http');
const { WebSocketServer } = require('ws');
const events = require('./events');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3009;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3200,http://localhost:5173').split(',');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

const VALID_TYPES = new Set([
  'new_message',
  'like',
  'comment',
  'new_follower',
  'badge_unlocked',
  'mission_completed',
  'group_vote',
  'group_invitation',
  'itinerary_updated',
  'weather_alert',
  'event_reminder',
  'place_proposal_reviewed',
  'system',
]);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'Notification Service is running', rabbitmq: events.isReady() ? 'up' : 'down' });
});

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function createNotification({ user_id, type, title, body, data }) {
  if (!VALID_TYPES.has(type)) throw new Error(`Unknown notification type: ${type}`);

  const result = await pool.query(
    `INSERT INTO notification.notifications (id, user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [uuidv4(), user_id, type, title, body || null, JSON.stringify(data || {})]
  );

  const notification = result.rows[0];
  broadcastToUser(user_id, { type: 'notification', notification });
  return notification;
}

// ------------------------------------------------------------
// Endpoint interne : création d'une notification par un autre service
// Protégé par une clé partagée (en plus de l'isolation réseau Docker,
// ce service n'étant pas exposé publiquement via l'api-gateway).
// ------------------------------------------------------------
const internalLimiter = rateLimit({ windowMs: 60 * 1000, max: 600 });

app.post('/internal/notifications', internalLimiter, async (req, res) => {
  if (!INTERNAL_SERVICE_KEY || req.headers['x-internal-key'] !== INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ error: 'Invalid or missing internal service key' });
  }

  const { user_id, type, title, body, data } = req.body;
  if (!user_id || !type || !title) {
    return res.status(400).json({ error: 'user_id, type and title are required' });
  }
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: `Unknown notification type: ${type}` });
  }

  try {
    const notification = await createNotification({ user_id, type, title, body, data });
    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ------------------------------------------------------------
// Endpoints publics (relayés par l'api-gateway avec user_id injecté du JWT)
// ------------------------------------------------------------

app.get('/notifications', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  const page = toInt(req.query.page, 1);
  const limit = Math.min(toInt(req.query.limit, 20), 50);
  const offset = (page - 1) * limit;
  const unreadOnly = req.query.unread_only === 'true';

  try {
    const result = await pool.query(
      `SELECT * FROM notification.notifications
       WHERE user_id = $1 ${unreadOnly ? 'AND is_read = false' : ''}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notification.notifications WHERE user_id = $1 ${unreadOnly ? 'AND is_read = false' : ''}`,
      [userId]
    );
    res.json({ notifications: result.rows, pagination: { page, limit, total: countResult.rows[0].total } });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.get('/notifications/unread-count', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM notification.notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    res.json({ count: result.rows[0].count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

app.post('/notifications/:id/read', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const result = await pool.query(
      `UPDATE notification.notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, user_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.post('/notifications/read-all', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const result = await pool.query(
      `UPDATE notification.notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false RETURNING id`,
      [user_id]
    );
    res.json({ updated: result.rows.length });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

app.delete('/notifications/:id', async (req, res) => {
  const userId = req.query.user_id || req.body.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  try {
    const result = await pool.query(
      'DELETE FROM notification.notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ------------------------------------------------------------
// WebSocket temps réel
// ------------------------------------------------------------
// NOTE PRODUCTION : registre en mémoire locale, valable pour une seule
// instance. Pour scaler horizontalement, remplacer par un pub/sub Redis
// (canal par user_id) une fois Redis intégré à l'infrastructure.
const userSockets = new Map(); // user_id -> Set<ws>

function broadcastToUser(userId, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(data);
  }
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, request) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket);

    socket.on('close', () => {
      userSockets.get(userId)?.delete(socket);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
    });

    socket.on('error', () => {
      userSockets.get(userId)?.delete(socket);
    });

    socket.send(JSON.stringify({ type: 'connected' }));
  } catch (err) {
    socket.close(4002, 'Invalid token');
  }
});

server.listen(PORT, () => {
  console.log(`Notification Service listening on port ${PORT} (HTTP + WebSocket /ws)`);
  events.start({ pool, createNotification });
});
