const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { query: validateQuery, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Le gateway est derrière le reverse-proxy nginx du frontend : sans ceci
// express-rate-limit rejette X-Forwarded-For et fait échouer chaque requête.
app.set('trust proxy', 1);

// ============================================================
// SÉCURITÉ OWASP TOP 10
// ============================================================

// A05 — Security Misconfiguration : Headers HTTP sécurisés
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.open-meteo.com', 'https://nominatim.openstreetmap.org', 'https://restcountries.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // nécessaire pour Leaflet tiles
}));

// A05 — X-Powered-By retiré automatiquement par helmet

// A01 — Broken Access Control : CORS strict
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3200,http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (ex : Postman, health checks internes)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin non autorisée — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// A04 — Insecure Design : Protection HTTP Parameter Pollution
app.use(hpp());

// Body parsing avec limite de taille (A08 — Software Integrity)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// A06 — Vulnerable Components : rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

// Rate limit strict sur l'authentification (A07 — Identification Failures)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: false,
});

// Rate limit pour les photos (protection quota API)
const photoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Limite de recherche photo atteinte. Réessayez dans 1 minute.' },
});

// Middleware de sécurité pour bloquer les injections basiques (A03 — Injection)
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        // Supprimer les balises HTML/script et les null bytes
        req.body[key] = value
          .replace(/<[^>]*>/g, '')
          .replace(/\0/g, '')
          .trim();
      }
    }
  }
  next();
}
app.use(sanitizeBody);

// Services backend URLs
const services = {
  auth:           process.env.AUTH_SERVICE_URL           || 'http://localhost:3001',
  catalog:        process.env.CATALOG_SERVICE_URL        || 'http://localhost:3002',
  itinerary:      process.env.ITINERARY_SERVICE_URL      || 'http://localhost:3003',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3004',
  analytics:      process.env.ANALYTICS_SERVICE_URL      || 'http://localhost:3005',
  chatbot:        process.env.CHATBOT_SERVICE_URL        || 'http://localhost:3006',
  groups:         process.env.GROUP_SERVICE_URL          || 'http://localhost:3007',
  message:        process.env.MESSAGE_SERVICE_URL        || 'http://localhost:3008',      // <-- ajout
  notification:   process.env.NOTIFICATION_SERVICE_URL   || 'http://localhost:3009',      // <-- ajout
  elasticsearch:  process.env.ELASTICSEARCH_URL          || 'http://elasticsearch:9200',
};

// ============================================================
// Proxy WebSocket — le frontend se connecte à /ws/messages et
// /ws/notifications avec le JWT en query string (?token=...).
// L'authentification est déléguée aux services internes.
// ============================================================
const messagesWsProxy = createProxyMiddleware({
  target: services.message,
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/ws/messages': '/ws' },
});

const notificationsWsProxy = createProxyMiddleware({
  target: services.notification,
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/ws/notifications': '/ws' },
});

app.use('/ws/messages', messagesWsProxy);
app.use('/ws/notifications', notificationsWsProxy);

// Services externes
const PEXELS_API_KEY    = process.env.PEXELS_API_KEY    || '';
const OSRM_URL          = process.env.OSRM_SERVICE_URL  || 'http://osrm:5000';

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'API Gateway is running', timestamp: new Date().toISOString() });
});

// JWT Verification Middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
      } catch (err) {
        // Guest fallback for public routes
      }
    }
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// Public routes - Auth Service
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const response = await axios.post(`${services.auth}/register`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Registration failed' });
  }
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const response = await axios.post(`${services.auth}/register`, req.body);
    res.json({
      user: {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        role: response.data.role,
      },
      token: response.data.token,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Signup failed' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const response = await axios.post(`${services.auth}/login`, req.body);
    res.json({
      user: {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        role: response.data.role,
      },
      token: response.data.token,
    });
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Login failed' });
  }
});

// Public / Optional routes - Catalog Service
app.get('/api/places', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/places`, {
      params: req.query,
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch places' });
  }
});

app.get('/api/places/:id', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/places/${req.params.id}`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch place' });
  }
});

app.get('/api/categories', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/categories`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch categories' });
  }
});

app.get('/api/events', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/events`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch events' });
  }
});

app.get('/api/admin/places', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/admin/places`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch admin places' });
  }
});

app.post('/api/admin/places', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/places`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create place' });
  }
});

app.put('/api/admin/places/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.put(`${services.catalog}/places/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update place' });
  }
});

app.delete('/api/admin/places/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.delete(`${services.catalog}/places/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to unpublish place' });
  }
});

app.get('/api/admin/events', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/admin/events`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch admin events' });
  }
});

app.post('/api/admin/events', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/events`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create event' });
  }
});

app.put('/api/admin/events/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.put(`${services.catalog}/events/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update event' });
  }
});

app.delete('/api/admin/events/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.delete(`${services.catalog}/events/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to unpublish event' });
  }
});

app.all('/api/admin/:resource(categories|tags|missions)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios({ method: req.method, url: `${services.catalog}/admin/${req.params.resource}`, data: req.body });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: `Failed to manage ${req.params.resource}` });
  }
});

app.all('/api/admin/:resource(categories|tags|missions)/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios({ method: req.method, url: `${services.catalog}/admin/${req.params.resource}/${req.params.id}`, data: req.body });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: `Failed to manage ${req.params.resource}` });
  }
});

app.post('/api/places/propose', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/places/propose`, { ...req.body, user_id: req.user.id }, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to propose place' });
  }
});

app.get('/api/missions', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/missions`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch missions' });
  }
});

app.get('/api/missions/user/:user_id', verifyJWT, async (req, res) => {
  try {
    const userId = req.params.user_id === 'me' ? req.user.id : req.params.user_id;
    const response = await axios.get(`${services.catalog}/missions/user/${userId}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch user missions' });
  }
});

app.post('/api/missions/:id/start', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/missions/${req.params.id}/start`, { ...req.body, user_id: req.user.id });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to start mission' });
  }
});

app.post('/api/missions/:id/progress', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/missions/${req.params.id}/progress`, { ...req.body, user_id: req.user.id });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update mission progress' });
  }
});

app.get('/api/proposals/user/:user_id', verifyJWT, async (req, res) => {
  try {
    const userId = req.params.user_id === 'me' ? req.user.id : req.params.user_id;
    const response = await axios.get(`${services.catalog}/proposals/user/${userId}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch proposals' });
  }
});

app.get('/api/admin/proposals/pending', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/proposals/pending`, { headers: { Authorization: req.headers.authorization } });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch pending proposals' });
  }
});

app.put('/api/admin/proposals/:id/approve', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.put(`${services.catalog}/proposals/${req.params.id}/approve`, req.body, { headers: { Authorization: req.headers.authorization } });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to approve proposal' });
  }
});

app.put('/api/admin/proposals/:id/reject', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.put(`${services.catalog}/proposals/${req.params.id}/reject`, req.body, { headers: { Authorization: req.headers.authorization } });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to reject proposal' });
  }
});

// --- Messagerie ---
app.post('/api/conversations', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.message}/conversations`, { ...req.body, user_id: req.user.id });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create conversation' });
  }
});
 
app.get('/api/conversations', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.message}/conversations`, {
      params: { user_id: req.user.id, page: req.query.page, limit: req.query.limit },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch conversations' });
  }
});
 
app.get('/api/conversations/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.message}/conversations/${req.params.id}`, {
      params: { user_id: req.user.id },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch conversation' });
  }
});
 
app.get('/api/conversations/:id/messages', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.message}/conversations/${req.params.id}/messages`, {
      params: { user_id: req.user.id, page: req.query.page, limit: req.query.limit },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch messages' });
  }
});
 
app.post('/api/conversations/:id/messages', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.message}/conversations/${req.params.id}/messages`, {
      ...req.body,
      user_id: req.user.id,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to send message' });
  }
});
 
app.post('/api/conversations/:id/read', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.message}/conversations/${req.params.id}/read`, { user_id: req.user.id });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to mark conversation as read' });
  }
});
 
app.delete('/api/messages/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.message}/messages/${req.params.id}`, {
      data: { user_id: req.user.id },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete message' });
  }
});
 
// --- Notifications ---
app.get('/api/notifications', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.notification}/notifications`, {
      params: { user_id: req.user.id, page: req.query.page, limit: req.query.limit, unread_only: req.query.unread_only },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch notifications' });
  }
});
 
app.get('/api/notifications/unread-count', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.notification}/notifications/unread-count`, {
      params: { user_id: req.user.id },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch unread count' });
  }
});
 
app.post('/api/notifications/:id/read', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.notification}/notifications/${req.params.id}/read`, { user_id: req.user.id });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update notification' });
  }
});
 
app.post('/api/notifications/read-all', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.notification}/notifications/read-all`, { user_id: req.user.id });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update notifications' });
  }
});
 
app.delete('/api/notifications/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.notification}/notifications/${req.params.id}`, {
      data: { user_id: req.user.id },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete notification' });
  }
});

// Protected routes - Itinerary Service
app.post('/api/itineraries', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.itinerary}/itineraries`, 
      { ...req.body, user_id: req.user.id },
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create itinerary' });
  }
});

app.post('/api/itineraries/generate', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.itinerary}/itineraries/generate`,
      { ...req.body, user_id: req.user.id },
      { headers: { Authorization: req.headers.authorization } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to generate itinerary' });
  }
});

app.post('/api/itineraries/:id/share', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.itinerary}/itineraries/${req.params.id}/share`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to share itinerary' });
  }
});

app.get('/api/public/itineraries/:shareToken', async (req, res) => {
  try {
    const response = await axios.get(`${services.itinerary}/public/itineraries/${req.params.shareToken}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch shared itinerary' });
  }
});

app.get('/api/itineraries/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.itinerary}/itineraries/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch itinerary' });
  }
});

app.get('/api/users/:user_id/itineraries', verifyJWT, async (req, res) => {
  try {
    const userId = req.params.user_id === 'me' ? req.user.id : req.params.user_id;
    const response = await axios.get(`${services.itinerary}/users/${userId}/itineraries`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch itineraries' });
  }
});

app.post('/api/itineraries/:id/days', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.itinerary}/itineraries/${req.params.id}/days`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add day' });
  }
});

app.post('/api/days/:day_id/activities', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.itinerary}/days/${req.params.day_id}/activities`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add activity' });
  }
});

app.put('/api/activities/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.put(`${services.itinerary}/activities/${req.params.id}`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update activity' });
  }
});

app.delete('/api/activities/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.itinerary}/activities/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete activity' });
  }
});

app.get('/api/weather', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.recommendation}/weather`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch weather' });
  }
});

// Protected routes - Recommendation Service
app.get('/api/recommendations', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.recommendation}/recommendations/${req.user.id}`, {
      params: req.query,
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch recommendations' });
  }
});

app.get('/api/recommendations/trending', optionalJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.recommendation}/trending`, {
      params: req.query,
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch trending places' });
  }
});

app.post('/api/recommendations/interactions', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.recommendation}/interactions`, {
      ...req.body,
      user_id: req.user.id,
    }, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to log interaction' });
  }
});

// Protected routes - Analytics Service
app.post('/api/analytics/events', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.analytics}/events`, {
      ...req.body,
      user_id: req.user.id,
    }, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to log analytics event' });
  }
});

app.get('/api/analytics/metrics', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.analytics}/metrics`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch analytics metrics' });
  }
});

// Protected routes - User Profile & Favorites (Auth Service)
app.get('/api/admin/users', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/admin/users`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch users' });
  }
});

app.patch('/api/admin/users/:id/status', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.patch(`${services.auth}/admin/users/${req.params.id}/status`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update user status' });
  }
});

app.patch('/api/admin/users/:id/role', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.patch(`${services.auth}/admin/users/${req.params.id}/role`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update user role' });
  }
});

app.all('/api/admin/badges', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios({ method: req.method, url: `${services.auth}/admin/badges`, data: req.body });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to manage badges' });
  }
});

app.all('/api/admin/badges/:id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios({ method: req.method, url: `${services.auth}/admin/badges/${req.params.id}`, data: req.body });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to manage badge' });
  }
});

app.get('/api/profile', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/users/${req.user.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch profile' });
  }
});

app.get('/api/profile/achievements', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/users/${req.user.id}/achievements`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch achievements' });
  }
});

app.get('/api/profile/visited-places', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/users/${req.user.id}/visited-places`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch visited places' });
  }
});

app.post('/api/profile/visited-places', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.auth}/users/${req.user.id}/visited-places`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add visited place' });
  }
});

app.get('/api/profile/favorites', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/users/${req.user.id}/favorites`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch favorites' });
  }
});

app.post('/api/profile/favorites', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.auth}/users/${req.user.id}/favorites`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add favorite' });
  }
});

app.delete('/api/profile/favorites/:place_id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.auth}/users/${req.user.id}/favorites/${req.params.place_id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to remove favorite' });
  }
});

// ==========================================
// MON HISTOIRE — Adventure Memories
// ==========================================

// GET all memories for current user
app.get('/api/memories', verifyJWT, async (req, res) => {
  try {
    const query = req.query;
    const qs = new URLSearchParams(query).toString();
    const response = await axios.get(`${services.auth}/users/${req.user.id}/memories?${qs}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch memories' });
  }
});

// GET memory for a specific place (check if exists)
app.get('/api/memories/place/:place_id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/users/${req.user.id}/memories/place/${req.params.place_id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Memory not found' });
  }
});

// GET single memory by id
app.get('/api/memories/:memory_id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.auth}/users/${req.user.id}/memories/${req.params.memory_id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Memory not found' });
  }
});

// POST create memory
app.post('/api/memories', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.auth}/users/${req.user.id}/memories`, req.body, {
      headers: { Authorization: req.headers.authorization },
      maxBodyLength: 10 * 1024 * 1024, // 10MB pour les photos base64
    });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create memory' });
  }
});

// PUT update memory
app.put('/api/memories/:memory_id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.put(`${services.auth}/users/${req.user.id}/memories/${req.params.memory_id}`, req.body, {
      headers: { Authorization: req.headers.authorization },
      maxBodyLength: 10 * 1024 * 1024,
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update memory' });
  }
});

// DELETE memory
app.delete('/api/memories/:memory_id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.auth}/users/${req.user.id}/memories/${req.params.memory_id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete memory' });
  }
});

// ==========================================
// GROUP SERVICE — Sorties de groupe, Votes & Expenses
// ==========================================

app.post('/api/groups', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.groups}/groups`, { ...req.body, user_id: req.user.id });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create group' });
  }
});

app.get('/api/groups', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.groups}/groups`, { params: { user_id: req.user.id } });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch groups' });
  }
});

app.post('/api/groups/join', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.groups}/groups/join`, { ...req.body, user_id: req.user.id });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to join group' });
  }
});

app.get('/api/groups/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.groups}/groups/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch group' });
  }
});

app.post('/api/groups/:id/votes', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.groups}/groups/${req.params.id}/votes`, { ...req.body, user_id: req.user.id });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to toggle vote' });
  }
});

app.post('/api/groups/:id/expenses', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.groups}/groups/${req.params.id}/expenses`, { ...req.body, user_id: req.user.id });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add expense' });
  }
});

app.get('/api/groups/:id/expenses', verifyJWT, async (req, res) => {
  try {
    const response = await axios.get(`${services.groups}/groups/${req.params.id}/expenses`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch expenses' });
  }
});

app.delete('/api/groups/:id/expenses/:expense_id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.groups}/groups/${req.params.id}/expenses/${req.params.expense_id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete expense' });
  }
});

app.delete('/api/groups/:id', verifyJWT, async (req, res) => {
  try {
    const response = await axios.delete(`${services.groups}/groups/${req.params.id}`, { data: { user_id: req.user.id } });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to archive group' });
  }
});

// ==========================================
// LOCAL CONTRIBUTIONS & MISSIONS
// ==========================================

app.get('/api/contributions', async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/contributions`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch contributions' });
  }
});

app.post('/api/contributions', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/contributions`, { ...req.body, user_id: req.user.id });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add contribution' });
  }
});

app.post('/api/contributions/:id/upvote', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/contributions/${req.params.id}/upvote`, { user_id: req.user.id });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to upvote contribution' });
  }
});

// ==========================================
// ROUTING — Proxy OSRM sécurisé (JWT requis)
// OSRM n'est jamais exposé directement au client.
// ==========================================

// const OSRM_URL = process.env.OSRM_SERVICE_URL || 'http://osrm:5000';

/**
 * Valide un tableau de coordonnées {lat, lon}.
 * Retourne une chaîne OSRM "lon,lat;lon,lat;..." ou null si invalide.
 * OSRM attend [longitude, latitude] dans l'URL — l'inverse de Leaflet.
 */
function buildOsrmCoords(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return null;
  if (waypoints.length > 100) return null; // protection anti-abus

  const coordStr = waypoints.map((wp) => {
    const lat = parseFloat(wp.lat);
    const lon = parseFloat(wp.lon);
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    // OSRM format : longitude,latitude
    return `${lon.toFixed(6)},${lat.toFixed(6)}`;
  });

  if (coordStr.includes(null)) return null;
  return coordStr.join(';');
}

/**
 * POST /api/routing/route
 * Calcule l'itinéraire ORDONNÉ entre N waypoints (service "route").
 * Corps : { waypoints: [{lat, lon, name?}, ...], profile?: "driving"|"walking"|"cycling" }
 * Répond : { routes: [...], waypoints: [...] }  (format OSRM natif)
 */
app.post('/api/routing/route', verifyJWT, async (req, res) => {
  const { waypoints, profile = 'driving' } = req.body;

  const coords = buildOsrmCoords(waypoints);
  if (!coords) {
    return res.status(400).json({
      error: 'waypoints invalides. Fournissez au moins 2 points {lat, lon} valides (max 100).',
    });
  }

  const allowedProfiles = ['driving', 'walking', 'cycling'];
  const safeProfile = allowedProfiles.includes(profile) ? profile : 'driving';

  try {
    const url =
      `${OSRM_URL}/route/v1/${safeProfile}/${coords}` +
      `?overview=full&geometries=geojson&steps=true&annotations=false`;

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.code !== 'Ok') {
      return res.status(422).json({ error: `OSRM: ${response.data.message || response.data.code}` });
    }

    res.json({
      code: response.data.code,
      routes: response.data.routes,
      waypoints: response.data.waypoints,
    });
  } catch (err) {
    const status = err.response?.status || 503;
    const message = err.code === 'ECONNREFUSED'
      ? 'Serveur de routage indisponible. Les données OSRM sont-elles préparées ?'
      : (err.response?.data?.message || err.message);
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/routing/trip
 * Calcule l'itinéraire OPTIMISÉ (ordre des étapes libre) entre N waypoints (service "trip").
 * Corps : { waypoints: [{lat, lon, name?}, ...], profile?: "driving"|"walking"|"cycling" }
 * Répond : { trips: [...], waypoints: [...] }  (format OSRM natif)
 */
app.post('/api/routing/trip', verifyJWT, async (req, res) => {
  const { waypoints, profile = 'driving' } = req.body;

  const coords = buildOsrmCoords(waypoints);
  if (!coords) {
    return res.status(400).json({
      error: 'waypoints invalides. Fournissez au moins 2 points {lat, lon} valides (max 100).',
    });
  }

  const allowedProfiles = ['driving', 'walking', 'cycling'];
  const safeProfile = allowedProfiles.includes(profile) ? profile : 'driving';

  try {
    const url =
      `${OSRM_URL}/trip/v1/${safeProfile}/${coords}` +
      `?overview=full&geometries=geojson&steps=true&roundtrip=false&source=first&destination=last`;

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data.code !== 'Ok') {
      return res.status(422).json({ error: `OSRM: ${response.data.message || response.data.code}` });
    }

    res.json({
      code: response.data.code,
      trips: response.data.trips,
      waypoints: response.data.waypoints,
    });
  } catch (err) {
    const status = err.response?.status || 503;
    const message = err.code === 'ECONNREFUSED'
      ? 'Serveur de routage indisponible. Les données OSRM sont-elles préparées ?'
      : (err.response?.data?.message || err.message);
    res.status(status).json({ error: message });
  }
});

// ── Proxy REST Countries (évite les problèmes CORS depuis le navigateur) ──
app.get('/api/country/:code', optionalJWT, async (req, res) => {
  const code = req.params.code.toUpperCase().replace(/[^A-Z]/g, '')
  if (!code || code.length < 2 || code.length > 3) {
    return res.status(400).json({ error: 'Code pays invalide.' })
  }
  try {
    const response = await axios.get(
      `https://restcountries.com/v3.1/alpha/${code}`,
      { timeout: 8000 }
    )
    // REST Countries retourne toujours un tableau
    res.json(Array.isArray(response.data) ? response.data[0] : response.data)
  } catch (err) {
    res.status(err.response?.status || 502).json({ error: 'Données pays indisponibles.' })
  }
})

// ============================================================
// PHOTOS — Pexels proxy (clé API stockée côté serveur uniquement)
// A02 — Cryptographic Failures : jamais exposer la clé au frontend
// ============================================================

app.get('/api/photos/search',
  photoLimiter,
  optionalJWT,
  [
    validateQuery('q').trim().notEmpty().isLength({ max: 100 }).escape(),
    validateQuery('per_page').optional().isInt({ min: 1, max: 40 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Paramètres invalides.', details: errors.array() });
    }

    const { q, per_page = 12 } = req.query;

    if (!PEXELS_API_KEY) {
      return res.status(503).json({ error: 'Service photos non configuré. Ajoutez PEXELS_API_KEY dans les variables d\'environnement.' });
    }

    try {
      const response = await axios.get('https://api.pexels.com/v1/search', {
        params: { query: q, per_page, locale: 'fr-FR' },
        headers: { Authorization: PEXELS_API_KEY },
        timeout: 8000,
      });
      res.json(response.data);
    } catch (error) {
      const status = error.response?.status || 502;
      res.status(status).json({ error: 'Erreur lors de la recherche photo.' });
    }
  }
);

// ============================================================
// ELASTICSEARCH — Recherche full-text des lieux
// ============================================================

// GET /api/search?q=marché&categories=...&limit=20
app.get('/api/search',
  optionalJWT,
  [
    validateQuery('q').trim().notEmpty().isLength({ max: 200 }).escape(),
    validateQuery('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    validateQuery('from').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Paramètres invalides.' });
    }

    const { q, limit = 20, from = 0 } = req.query;

    try {
      const esBody = {
        from: Number(from),
        size: Number(limit),
        query: {
          multi_match: {
            query: q,
            fields: ['name^3', 'description^2', 'long_description', 'address', 'category_name'],
            type: 'best_fields',
            fuzziness: 'AUTO',      // tolère les fautes de frappe
            prefix_length: 2,       // les 2 premiers caractères doivent correspondre
            operator: 'or',
          },
        },
        highlight: {
          fields: {
            name:        { number_of_fragments: 0 },
            description: { fragment_size: 120, number_of_fragments: 1 },
          },
          pre_tags:  ['<mark>'],
          post_tags: ['</mark>'],
        },
        _source: ['id', 'name', 'description', 'address', 'category_name', 'cover_image', 'rating', 'price_level', 'latitude', 'longitude'],
      };

      const esRes = await axios.post(
        `${services.elasticsearch}/globetrotter_places/_search`,
        esBody,
        { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
      );

      const hits = esRes.data.hits?.hits || [];
      const results = hits.map((h) => ({
        ...h._source,
        score:     h._score,
        highlight: h.highlight || {},
      }));

      res.json({
        results,
        total: esRes.data.hits?.total?.value || 0,
        took: esRes.data.took,
      });
    } catch (error) {
      // Fallback : si Elasticsearch n'est pas disponible, on interroge le catalog
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        try {
          const fallback = await axios.get(`${services.catalog}/places`, {
            params: { limit: Number(limit) },
            headers: { Authorization: req.headers.authorization },
          });
          const places = (fallback.data.places || []).filter((p) =>
            p.name?.toLowerCase().includes(q.toLowerCase()) ||
            p.description?.toLowerCase().includes(q.toLowerCase())
          );
          return res.json({ results: places, total: places.length, took: 0, fallback: true });
        } catch (fallbackErr) {
          return res.status(503).json({ error: 'Moteur de recherche indisponible.' });
        }
      }
      res.status(502).json({ error: 'Erreur lors de la recherche.' });
    }
  }
);

// POST /api/search/index — indexer/réindexer un lieu (admin only)
app.post('/api/search/index/:place_id', verifyJWT, requireAdmin, async (req, res) => {
  const { place_id } = req.params;
  try {
    // Récupérer le lieu depuis le catalog
    const placeRes = await axios.get(`${services.catalog}/places/${place_id}`);
    const place = placeRes.data;

    // Indexer dans Elasticsearch
    await axios.put(
      `${services.elasticsearch}/globetrotter_places/_doc/${place_id}`,
      {
        id:            place.id,
        name:          place.name,
        description:   place.description,
        long_description: place.long_description,
        address:       place.address,
        category_name: place.category_name || '',
        cover_image:   place.cover_image,
        rating:        place.rating,
        price_level:   place.price_level,
        latitude:      place.latitude,
        longitude:     place.longitude,
        status:        place.status,
        indexed_at:    new Date().toISOString(),
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({ message: `Lieu ${place_id} indexé dans Elasticsearch.` });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Erreur d\'indexation.' });
  }
});

// DELETE /api/search/index/:place_id — désindexer (admin)
app.delete('/api/search/index/:place_id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    await axios.delete(`${services.elasticsearch}/globetrotter_places/_doc/${req.params.place_id}`);
    res.json({ message: 'Lieu désindexé.' });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Erreur de désindexation.' });
  }
});

// A09 — Security Logging : log des erreurs sans exposer les détails en prod
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Une erreur interne est survenue.',
    ...(isDev && { stack: err.stack }),
  });
});

// ==========================================
// AUDIOS - Ambient & Curated Sounds
// ==========================================

// GET all active audios
app.get('/api/audios', async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/audios`, {
      params: { active: true }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch audios' });
  }
});

// GET single audio
app.get('/api/audios/:audio_id', async (req, res) => {
  try {
    const response = await axios.get(`${services.catalog}/audios/${req.params.audio_id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Audio not found' });
  }
});

// POST create audio (admin only)
app.post('/api/audios', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/audios`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create audio' });
  }
});

// PUT update audio (admin only)
app.put('/api/audios/:audio_id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.put(`${services.catalog}/audios/${req.params.audio_id}`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to update audio' });
  }
});

// DELETE audio (admin only)
app.delete('/api/audios/:audio_id', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const response = await axios.delete(`${services.catalog}/audios/${req.params.audio_id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete audio' });
  }
});

// POST log audio play (for analytics)
app.post('/api/audios/:audio_id/play', verifyJWT, async (req, res) => {
  try {
    const response = await axios.post(`${services.catalog}/audios/${req.params.audio_id}/play`, {}, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to log play' });
  }
});

// ========== CHATBOT ROUTES ==========
// Create new conversation
app.post('/api/chats', async (req, res) => {
  try {
    const response = await axios.post(`${services.chatbot}/api/chats`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create chat' });
  }
});

// Get conversation history
app.get('/api/chats/:conversation_id', async (req, res) => {
  try {
    const response = await axios.get(`${services.chatbot}/api/chats/${req.params.conversation_id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to get chat' });
  }
});

// Send message
app.post('/api/chats/:conversation_id/messages', async (req, res) => {
  try {
    const response = await axios.post(
      `${services.chatbot}/api/chats/${req.params.conversation_id}/messages`,
      req.body
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to send message' });
  }
});

// Delete conversation
app.delete('/api/chats/:conversation_id', async (req, res) => {
  try {
    const response = await axios.delete(`${services.chatbot}/api/chats/${req.params.conversation_id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete chat' });
  }
});

app.post('/api/stories', verifyJWT, async (req, res) => {
  try { const response = await axios.post(`${services.catalog}/stories`, { ...req.body, user_id: req.user.id }); res.status(response.status).json(response.data); }
  catch (error) { res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to create story' }); }
});

app.get('/api/places/:place_id/stories', verifyJWT, async (req, res) => {
  try { const response = await axios.get(`${services.catalog}/stories/place/${req.params.place_id}`); res.json(response.data); }
  catch (error) { res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch stories' }); }
});

app.get('/api/admin/stories/pending', verifyJWT, requireAdmin, async (req, res) => {
  try { const response = await axios.get(`${services.catalog}/stories/pending`); res.json(response.data); }
  catch (error) { res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch stories' }); }
});

app.put('/api/admin/stories/:id/:decision', verifyJWT, requireAdmin, async (req, res) => {
  try { const response = await axios.put(`${services.catalog}/stories/${req.params.id}/${req.params.decision}`, { ...req.body, reviewed_by: req.user.id }); res.json(response.data); }
  catch (error) { res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to moderate story' }); }
});

// 404 handler — ne pas exposer la structure des routes (A05)
app.use((req, res) => {
  res.status(404).json({ error: 'Ressource introuvable.' });
});

const httpServer = http.createServer(app);

// http-proxy-middleware ne s'abonne à l'upgrade que si une requête HTTP
// a déjà traversé le middleware : on câble les handlers explicitement.
httpServer.on('upgrade', (req, socket, head) => {
  const pathname = req.url || '';
  if (pathname.startsWith('/ws/messages')) {
    messagesWsProxy.upgrade(req, socket, head);
  } else if (pathname.startsWith('/ws/notifications')) {
    notificationsWsProxy.upgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT} (HTTP + WS proxy)`);
});

