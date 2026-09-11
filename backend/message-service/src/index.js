// ============================================================
// GLOBETROTTER — Message Service
// Conversations privées et de groupe, messages, pièces jointes,
// partage de lieux/itinéraires, lu/non-lu, temps réel (WebSocket).
//
// Convention du projet : l'api-gateway vérifie le JWT et injecte
// `user_id` (extrait du token) dans le body/query avant de relayer
// la requête ici. Ce service revalide malgré tout que `user_id`
// est bien participant de la ressource demandée (défense en
// profondeur — ne jamais faire confiance uniquement au gateway).
// ============================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3008;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3200,http://localhost:5173').split(',');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Rate limit dédié : anti-spam de messagerie
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 messages/minute max par IP (le gateway limite déjà globalement)
  message: { error: 'Trop de messages envoyés. Ralentissez.' },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'Message Service is running' });
});

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function isParticipant(conversationId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM message.conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL',
    [conversationId, userId]
  );
  return result.rows.length > 0;
}

// ------------------------------------------------------------
// Conversations
// ------------------------------------------------------------

// Créer (ou réutiliser) une conversation directe, ou créer une conversation de groupe
app.post('/conversations', async (req, res) => {
  const { user_id, participant_ids, type, title, group_id } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
    return res.status(400).json({ error: 'participant_ids must be a non-empty array' });
  }

  const conversationType = type === 'group' ? 'group' : 'direct';
  const allParticipantIds = Array.from(new Set([user_id, ...participant_ids]));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (conversationType === 'direct') {
      if (allParticipantIds.length !== 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'A direct conversation requires exactly 2 distinct participants' });
      }
      // Réutiliser une conversation directe existante entre ces deux utilisateurs si elle existe déjà
      const existing = await client.query(
        `SELECT c.id
         FROM message.conversations c
         WHERE c.type = 'direct'
           AND (SELECT COUNT(*) FROM message.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.left_at IS NULL) = 2
           AND EXISTS (SELECT 1 FROM message.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = $1 AND cp.left_at IS NULL)
           AND EXISTS (SELECT 1 FROM message.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = $2 AND cp.left_at IS NULL)
         LIMIT 1`,
        [allParticipantIds[0], allParticipantIds[1]]
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return res.status(200).json({ id: existing.rows[0].id, reused: true });
      }
    }

    const conversationId = uuidv4();
    await client.query(
      `INSERT INTO message.conversations (id, type, title, group_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [conversationId, conversationType, title || null, group_id || null, user_id]
    );

    for (const participantId of allParticipantIds) {
      await client.query(
        `INSERT INTO message.conversation_participants (conversation_id, user_id)
         VALUES ($1, $2) ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL`,
        [conversationId, participantId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: conversationId, reused: false });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  } finally {
    client.release();
  }
});

// Lister les conversations d'un utilisateur, avec dernier message et compteur non-lu
app.get('/conversations', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  const page = toInt(req.query.page, 1);
  const limit = Math.min(toInt(req.query.limit, 20), 50);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT
         c.id, c.type, c.title, c.group_id, c.created_at,
         lm.content AS last_message_content,
         lm.sender_id AS last_message_sender_id,
         lm.created_at AS last_message_at,
         (
           SELECT COUNT(*)::int FROM message.messages m
           WHERE m.conversation_id = c.id
             AND m.deleted_at IS NULL
             AND m.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamp)
             AND m.sender_id != $1
         ) AS unread_count,
         ARRAY(
           SELECT cp2.user_id FROM message.conversation_participants cp2
           WHERE cp2.conversation_id = c.id AND cp2.left_at IS NULL AND cp2.user_id != $1
         ) AS other_participant_ids
       FROM message.conversations c
       JOIN message.conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1 AND cp.left_at IS NULL
       LEFT JOIN LATERAL (
         SELECT content, sender_id, created_at FROM message.messages
         WHERE conversation_id = c.id AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       ) lm ON true
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM message.conversation_participants WHERE user_id = $1 AND left_at IS NULL`,
      [userId]
    );

    res.json({
      conversations: result.rows,
      pagination: { page, limit, total: countResult.rows[0].total },
    });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Détail d'une conversation (participants)
app.get('/conversations/:id', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  try {
    if (!(await isParticipant(req.params.id, userId))) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }
    const conversation = await pool.query('SELECT * FROM message.conversations WHERE id = $1', [req.params.id]);
    if (!conversation.rows.length) return res.status(404).json({ error: 'Conversation not found' });

    const participants = await pool.query(
      'SELECT user_id, joined_at, last_read_at FROM message.conversation_participants WHERE conversation_id = $1 AND left_at IS NULL',
      [req.params.id]
    );

    res.json({ ...conversation.rows[0], participants: participants.rows });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ------------------------------------------------------------
// Messages
// ------------------------------------------------------------

// Historique paginé (le plus récent en premier, à inverser côté frontend pour l'affichage)
app.get('/conversations/:id/messages', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  const page = toInt(req.query.page, 1);
  const limit = Math.min(toInt(req.query.limit, 30), 100);
  const offset = (page - 1) * limit;

  try {
    if (!(await isParticipant(req.params.id, userId))) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const result = await pool.query(
      `SELECT id, conversation_id, sender_id, content, attachment_url, attachment_type,
              shared_place_id, shared_itinerary_id, created_at, edited_at
       FROM message.messages
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    res.json({ messages: result.rows, pagination: { page, limit } });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Envoyer un message (texte, pièce jointe, partage de lieu/itinéraire)
app.post('/conversations/:id/messages', messageLimiter, async (req, res) => {
  const { user_id, content, attachment_url, attachment_type, shared_place_id, shared_itinerary_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  if (!content && !attachment_url && !shared_place_id && !shared_itinerary_id) {
    return res.status(400).json({ error: 'A message needs content, an attachment, or a shared resource' });
  }
  if (content && content.length > 5000) {
    return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
  }

  try {
    if (!(await isParticipant(req.params.id, user_id))) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const messageId = uuidv4();
    const result = await pool.query(
      `INSERT INTO message.messages
         (id, conversation_id, sender_id, content, attachment_url, attachment_type, shared_place_id, shared_itinerary_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        messageId,
        req.params.id,
        user_id,
        content || null,
        attachment_url || null,
        attachment_type || null,
        shared_place_id || null,
        shared_itinerary_id || null,
      ]
    );

    const message = result.rows[0];

    // Récupérer les autres participants pour push temps réel + notification
    const others = await pool.query(
      'SELECT user_id FROM message.conversation_participants WHERE conversation_id = $1 AND user_id != $2 AND left_at IS NULL',
      [req.params.id, user_id]
    );

    for (const row of others.rows) {
      broadcastToUser(row.user_id, { type: 'new_message', message });
      notifyNewMessage(row.user_id, user_id, req.params.id, message).catch((err) =>
        console.error('Notification dispatch failed (non-blocking):', err.message)
      );
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Marquer une conversation comme lue
app.post('/conversations/:id/read', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const result = await pool.query(
      `UPDATE message.conversation_participants SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, user_id]
    );
    if (!result.rows.length) return res.status(403).json({ error: 'Not a participant of this conversation' });
    res.json({ success: true, last_read_at: result.rows[0].last_read_at });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

// Suppression douce d'un message (par son auteur uniquement)
app.delete('/messages/:id', async (req, res) => {
  const userId = req.query.user_id || req.body.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  try {
    const result = await pool.query(
      `UPDATE message.messages SET deleted_at = NOW(), content = NULL, attachment_url = NULL
       WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL RETURNING id`,
      [req.params.id, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Message not found or not owned by user' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ------------------------------------------------------------
// Notification interservice (best-effort, ne bloque jamais l'envoi du message)
// ------------------------------------------------------------
async function notifyNewMessage(recipientUserId, senderUserId, conversationId, message) {
  await axios.post(
    `${NOTIFICATION_SERVICE_URL}/internal/notifications`,
    {
      user_id: recipientUserId,
      type: 'new_message',
      title: 'Nouveau message',
      body: message.content ? message.content.slice(0, 140) : 'Nouvelle pièce jointe reçue',
      data: { conversation_id: conversationId, message_id: message.id, sender_id: senderUserId },
    },
    { timeout: 3000, headers: { 'x-internal-key': process.env.INTERNAL_SERVICE_KEY || '' } }
  );
}

// ------------------------------------------------------------
// WebSocket temps réel
// ------------------------------------------------------------
// NOTE PRODUCTION : ce registre est en mémoire locale. Il ne fonctionne
// correctement qu'avec une seule instance de ce service. Pour scaler
// horizontalement, remplacer par un pub/sub Redis (canal par user_id)
// une fois Redis intégré à l'infrastructure.
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
  console.log(`Message Service listening on port ${PORT} (HTTP + WebSocket /ws)`);
});
