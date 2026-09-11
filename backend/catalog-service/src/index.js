const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const cache = require('./cache');
const search = require('./elasticsearch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const PLACES_CACHE_PREFIX = 'catalog:places:';
const CATEGORIES_CACHE_KEY = 'catalog:categories';

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

// Middleware
app.use(express.json());

async function invalidatePlaceCaches(placeId) {
  await cache.invalidatePrefix(PLACES_CACHE_PREFIX);
  if (placeId) await cache.del(`${PLACES_CACHE_PREFIX}id:${placeId}`);
}

// Health check
app.get('/health', async (req, res) => {
  res.json({
    status: 'Catalog Service is running',
    redis: cache.isReady() ? 'up' : 'down',
    elasticsearch: (await search.ping()) ? 'up' : 'down',
  });
});

// Get all categories
app.get('/categories', async (req, res) => {
  try {
    const cached = await cache.get(CATEGORIES_CACHE_KEY);
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM catalog.categories ORDER BY name');
    await cache.set(CATEGORIES_CACHE_KEY, result.rows, 3600);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all places
app.get('/places', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const cacheKey = `${PLACES_CACHE_PREFIX}list:${category || 'all'}:${safeLimit}:${safeOffset}`;

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    let query = 'SELECT * FROM catalog.places WHERE is_published = $1';
    const params = [true];

    if (category) {
      query += ' AND category_id = $2';
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(safeLimit, safeOffset);

    const result = await pool.query(query, params);
    const payload = { places: result.rows, count: result.rows.length };
    await cache.set(cacheKey, payload, 300);
    res.json(payload);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// Get place by ID
app.get('/places/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `${PLACES_CACHE_PREFIX}id:${id}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query(
      'SELECT * FROM catalog.places WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Get tags for this place
    const tagsResult = await pool.query(
      'SELECT t.* FROM catalog.tags t JOIN catalog.place_tags pt ON t.id = pt.tag_id WHERE pt.place_id = $1',
      [id]
    );

    const place = result.rows[0];
    place.tags = tagsResult.rows;

    await cache.set(cacheKey, place, 600);
    res.json(place);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ error: 'Failed to fetch place' });
  }
});

app.get('/admin/places', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  try {
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM catalog.places');
    const result = await pool.query(
      'SELECT * FROM catalog.places ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({ items: result.rows, total: parseInt(countResult.rows[0].total, 10), count: result.rows.length });
  } catch (error) {
    console.error('Error fetching admin places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

const adminResources = {
  categories: { table: 'catalog.categories', fields: ['name', 'slug', 'description', 'icon_url', 'color_hex'] },
  tags: { table: 'catalog.tags', fields: ['name', 'slug', 'category_id'] },
  missions: { table: 'catalog.missions', fields: ['name', 'description', 'category_id', 'required_place_count', 'icon_url', 'reward_text', 'is_active'] },
};

app.get('/admin/:resource(categories|tags|missions)', async (req, res) => {
  const resource = adminResources[req.params.resource];
  try {
    const result = await pool.query(`SELECT * FROM ${resource.table} ORDER BY created_at DESC`);
    res.json({ items: result.rows, total: result.rows.length });
  } catch (error) {
    console.error(`Error fetching admin ${req.params.resource}:`, error);
    res.status(500).json({ error: `Failed to fetch ${req.params.resource}` });
  }
});

app.post('/admin/:resource(categories|tags|missions)', async (req, res) => {
  const resource = adminResources[req.params.resource];
  const values = resource.fields.map(field => req.body[field] ?? null);
  if (!req.body.name || (req.params.resource !== 'missions' && !req.body.slug)) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }
  if (req.params.resource === 'missions' && (!Number.isInteger(req.body.required_place_count) || req.body.required_place_count < 1)) {
    return res.status(400).json({ error: 'required_place_count must be a positive integer' });
  }
  try {
    const columns = resource.fields.join(', ');
    const placeholders = resource.fields.map((_, index) => `$${index + 1}`).join(', ');
    const result = await pool.query(`INSERT INTO ${resource.table} (${columns}) VALUES (${placeholders}) RETURNING *`, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(`Error creating ${req.params.resource}:`, error);
    res.status(500).json({ error: `Failed to create ${req.params.resource}` });
  }
});

app.put('/admin/:resource(categories|tags|missions)/:id', async (req, res) => {
  const resource = adminResources[req.params.resource];
  const fields = resource.fields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field));
  if (!fields.length) return res.status(400).json({ error: 'No editable fields provided' });
  if (fields.includes('required_place_count') && (!Number.isInteger(req.body.required_place_count) || req.body.required_place_count < 1)) {
    return res.status(400).json({ error: 'required_place_count must be a positive integer' });
  }
  try {
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = [...fields.map(field => req.body[field]), req.params.id];
    const result = await pool.query(`UPDATE ${resource.table} SET ${assignments} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Resource not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating ${req.params.resource}:`, error);
    res.status(500).json({ error: `Failed to update ${req.params.resource}` });
  }
});

app.delete('/admin/:resource(categories|tags|missions)/:id', async (req, res) => {
  const resource = adminResources[req.params.resource];
  try {
    const result = await pool.query(`DELETE FROM ${resource.table} WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Resource not found' });
    res.status(204).send();
  } catch (error) {
    const message = error.code === '23503' ? 'This resource is still in use and cannot be deleted.' : `Failed to delete ${req.params.resource}`;
    res.status(error.code === '23503' ? 409 : 500).json({ error: message });
  }
});

// Create a new place (Admin only)
app.post('/places', async (req, res) => {
  const {
    name,
    slug,
    category_id,
    description,
    long_description,
    address,
    latitude,
    longitude,
    rating,
    price_level,
    opening_hours,
    phone,
    website,
    cover_image_url,
  } = req.body;

  if (!name || !slug || !category_id) {
    return res.status(400).json({ error: 'Name, slug, and category_id are required' });
  }

  try {
    const placeId = uuidv4();
    const result = await pool.query(
      `INSERT INTO catalog.places 
      (id, name, slug, category_id, description, long_description, address, latitude, longitude, rating, price_level, opening_hours, phone, website, cover_image_url, is_published, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW())
       RETURNING *`,
          [placeId, name, slug, category_id, description, long_description, address, latitude, longitude, rating, price_level, opening_hours, phone, website, cover_image_url]
    );

    await invalidatePlaceCaches(placeId);
    await search.indexPlaceById(pool, placeId);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(500).json({ error: 'Failed to create place' });
  }
});

app.put('/places/:id', async (req, res) => {
  const { id } = req.params;
  const { name, slug, category_id, description, address, latitude, longitude, cover_image_url, is_published } = req.body;
  try {
    const result = await pool.query(
      `UPDATE catalog.places SET name = COALESCE($1, name), slug = COALESCE($2, slug),
       category_id = COALESCE($3, category_id), description = COALESCE($4, description),
       address = COALESCE($5, address), latitude = COALESCE($6, latitude), longitude = COALESCE($7, longitude),
       cover_image_url = COALESCE($8, cover_image_url), is_published = COALESCE($9, is_published), updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [name, slug, category_id, description, address, latitude, longitude, cover_image_url, is_published, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Place not found' });

    await invalidatePlaceCaches(id);
    if (result.rows[0].is_published === false) {
      await search.removePlace(id);
    } else {
      await search.indexPlaceById(pool, id);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(500).json({ error: 'Failed to update place' });
  }
});

app.delete('/places/:id', async (req, res) => {
  try {
    const result = await pool.query('UPDATE catalog.places SET is_published = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Place not found' });

    await invalidatePlaceCaches(req.params.id);
    await search.removePlace(req.params.id);

    res.json({ message: 'Place unpublished' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unpublish place' });
  }
});

// Get all events
app.get('/events', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM catalog.events WHERE is_published = true AND COALESCE(start_date, CURRENT_DATE) >= CURRENT_DATE ORDER BY start_date',
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event (Admin only)
app.post('/events', async (req, res) => {
  const { name, description, start_date, start_time, end_date, end_time, image_url, place_id } = req.body;

  if (!name || !start_date || !place_id) {
    return res.status(400).json({ error: 'Name, start_date, and place_id are required' });
  }

  try {
    const eventId = uuidv4();
    const result = await pool.query(
      `INSERT INTO catalog.events (id, name, description, place_id, start_date, start_time, end_date, end_time, image_url, is_published, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
       RETURNING *`,
      [eventId, name, description, place_id, start_date, start_time, end_date, end_time, image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.get('/admin/events', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  try {
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM catalog.events');
    const result = await pool.query(
      'SELECT * FROM catalog.events ORDER BY start_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({ items: result.rows, total: parseInt(countResult.rows[0].total, 10), count: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.put('/events/:id', async (req, res) => {
  const { name, description, start_date, start_time, end_date, end_time, image_url, place_id, is_published } = req.body;
  try {
    const result = await pool.query(
      `UPDATE catalog.events SET name = COALESCE($1, name), description = COALESCE($2, description),
       start_date = COALESCE($3, start_date), start_time = COALESCE($4, start_time), end_date = COALESCE($5, end_date),
       end_time = COALESCE($6, end_time), image_url = COALESCE($7, image_url), place_id = COALESCE($8, place_id),
       is_published = COALESCE($9, is_published), updated_at = NOW() WHERE id = $10 RETURNING *`,
      [name, description, start_date, start_time, end_date, end_time, image_url, place_id, is_published, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/events/:id', async (req, res) => {
  try {
    const result = await pool.query('UPDATE catalog.events SET is_published = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event unpublished' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unpublish event' });
  }
});

// Propose a new place (User submission)
app.post('/places/propose', async (req, res) => {
  const { name, description, address, latitude, longitude, category_id, user_id, image_urls = [] } = req.body;

  if (!name || !user_id) {
    return res.status(400).json({ error: 'Le nom du lieu et la connexion utilisateur sont requis' });
  }

  const finalDescription = description || 'Lieu proposé par la communauté.';
  const finalAddress = address || 'Libreville, Gabon';
  const finalLat = parseFloat(latitude) || 0.392;
  const finalLng = parseFloat(longitude) || 9.453;
  const finalCategoryId = category_id || null;

  if (!Array.isArray(image_urls) || image_urls.some(url => typeof url !== 'string' || url.length > 7 * 1024 * 1024)) {
    return res.status(400).json({ error: 'La photo envoyée dépasse la limite autorisée' });
  }

  try {
    const proposalId = uuidv4();
    const result = await pool.query(
      `INSERT INTO catalog.place_proposals 
      (id, name, description, address, latitude, longitude, category_id, user_id, status, image_urls, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [proposalId, name, finalDescription, finalAddress, finalLat, finalLng, finalCategoryId, user_id, 'pending', image_urls]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error proposing place:', error);
    res.status(500).json({ error: 'Failed to propose place' });
  }
});

// Get all pending proposals (Admin only)
app.get('/proposals/pending', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM catalog.place_proposals WHERE status = $1 ORDER BY created_at',
      ['pending']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Get user's proposal status
app.get('/proposals/user/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, name, address, description, image_urls, status, created_at FROM catalog.place_proposals WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user proposals:', error);
    res.status(500).json({ error: 'Failed to fetch user proposals' });
  }
});

// Approve a proposal (Admin only)
app.put('/proposals/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const proposalResult = await pool.query(
      'SELECT * FROM catalog.place_proposals WHERE id = $1',
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];
    const placeId = uuidv4();
    const slug = `${proposal.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${placeId.slice(0, 8)}`;

    // Create the place
    await pool.query(
      `INSERT INTO catalog.places 
       (id, name, slug, description, long_description, address, latitude, longitude, category_id, is_published, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())`,
      [placeId, proposal.name, slug, proposal.description, proposal.description, proposal.address, proposal.latitude, proposal.longitude, proposal.category_id]
    );

    // Update proposal status
    await pool.query(
      'UPDATE catalog.place_proposals SET status = $1 WHERE id = $2',
      ['approved', id]
    );

    await invalidatePlaceCaches(placeId);
    await search.indexPlaceById(pool, placeId);

    res.json({ message: 'Proposal approved', place_id: placeId });
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.status(500).json({ error: 'Failed to approve proposal' });
  }
});

// Reject a proposal (Admin only)
app.put('/proposals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    await pool.query(
      'UPDATE catalog.place_proposals SET status = $1, rejection_reason = $2 WHERE id = $3',
      ['rejected', reason || null, id]
    );

    res.json({ message: 'Proposal rejected' });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    res.status(500).json({ error: 'Failed to reject proposal' });
  }
});

// Error handling
app.get('/missions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM catalog.missions WHERE is_active = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

app.get('/missions/user/:user_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, COALESCE(um.places_completed, 0) AS places_completed, um.started_at, um.completed_at
       FROM catalog.missions m LEFT JOIN catalog.user_missions um ON um.mission_id = m.id AND um.user_id = $1
       WHERE m.is_active = true ORDER BY m.created_at DESC`,
      [req.params.user_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user missions' });
  }
});

app.post('/missions/:id/start', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const result = await pool.query(
      `INSERT INTO catalog.user_missions (user_id, mission_id) VALUES ($1, $2)
       ON CONFLICT (user_id, mission_id) DO UPDATE SET started_at = catalog.user_missions.started_at
       RETURNING *`,
      [user_id, req.params.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start mission' });
  }
});

app.post('/missions/:id/progress', async (req, res) => {
  const { user_id, places_completed } = req.body;
  if (!user_id || !Number.isInteger(places_completed) || places_completed < 0) return res.status(400).json({ error: 'user_id and a valid places_completed are required' });
  try {
    const result = await pool.query(
      `INSERT INTO catalog.user_missions (user_id, mission_id, places_completed)
       SELECT $1, m.id, LEAST($3, m.required_place_count) FROM catalog.missions m WHERE m.id = $2
       ON CONFLICT (user_id, mission_id) DO UPDATE SET places_completed = EXCLUDED.places_completed,
      completed_at = CASE WHEN EXCLUDED.places_completed >= (SELECT required_place_count FROM catalog.missions WHERE id = EXCLUDED.mission_id) THEN COALESCE(catalog.user_missions.completed_at, NOW()) ELSE NULL END
       RETURNING *`,
      [user_id, req.params.id, places_completed]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Mission not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mission progress' });
  }
});

app.post('/stories', async (req, res) => {
  const { place_id, user_id, title, story_text, image_urls = [] } = req.body;
  if (!place_id || !user_id || !story_text) return res.status(400).json({ error: 'place_id, user_id, and story_text are required' });
  try {
    const result = await pool.query(
      `INSERT INTO catalog.place_stories (place_id, user_id, title, story_text, image_urls)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [place_id, user_id, title || null, story_text, image_urls]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create story' });
  }
});

app.get('/stories/place/:place_id', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM catalog.place_stories WHERE place_id = $1 AND status = 'approved' ORDER BY created_at DESC", [req.params.place_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

app.get('/stories/pending', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM catalog.place_stories WHERE status = 'pending' ORDER BY created_at ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending stories' });
  }
});

app.put('/stories/:id/:decision', async (req, res) => {
  const { decision } = req.params;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid moderation decision' });
  try {
    const result = await pool.query(
      'UPDATE catalog.place_stories SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *',
      [decision, req.body.reviewed_by || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Story not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to moderate story' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// AUDIOS - Ambient & Curated Sounds
// ============================================================

// GET all active audios
app.get('/audios', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, audio_url, thumbnail_url, duration_seconds, category, created_at
       FROM catalog.audios
       WHERE is_active = true
       ORDER BY created_at DESC`
    );
    res.json({ audios: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching audios:', error);
    res.status(500).json({ error: 'Failed to fetch audios' });
  }
});

// GET single audio
app.get('/audios/:audio_id', async (req, res) => {
  const { audio_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM catalog.audios WHERE id = $1 AND is_active = true',
      [audio_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audio not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching audio:', error);
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

// POST create audio
app.post('/audios', async (req, res) => {
  const { title, description, audio_url, thumbnail_url, duration_seconds, category } = req.body;

  if (!title || !audio_url) {
    return res.status(400).json({ error: 'Title and audio_url are required' });
  }

  try {
    const audioId = uuidv4();
    await pool.query(
      `INSERT INTO catalog.audios (id, title, description, audio_url, thumbnail_url, duration_seconds, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [audioId, title, description || null, audio_url, thumbnail_url || null, duration_seconds || null, category || 'ambient']
    );

    res.status(201).json({
      id: audioId,
      title,
      description,
      audio_url,
      thumbnail_url,
      duration_seconds,
      category,
    });
  } catch (error) {
    console.error('Error creating audio:', error);
    res.status(500).json({ error: 'Failed to create audio' });
  }
});

// PUT update audio
app.put('/audios/:audio_id', async (req, res) => {
  const { audio_id } = req.params;
  const { title, description, audio_url, thumbnail_url, duration_seconds, category, is_active } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (audio_url !== undefined) {
      updates.push(`audio_url = $${paramIndex++}`);
      values.push(audio_url);
    }
    if (thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex++}`);
      values.push(thumbnail_url);
    }
    if (duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramIndex++}`);
      values.push(duration_seconds);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(audio_id);

    const query = `UPDATE catalog.audios SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating audio:', error);
    res.status(500).json({ error: 'Failed to update audio' });
  }
});

// DELETE audio (soft delete)
app.delete('/audios/:audio_id', async (req, res) => {
  const { audio_id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE catalog.audios SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [audio_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json({ message: 'Audio deleted successfully', id: audio_id });
  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

// POST log audio play
app.post('/audios/:audio_id/play', async (req, res) => {
  const { audio_id } = req.params;

  try {
    await pool.query(
      `INSERT INTO catalog.audio_play_count (id, audio_id) VALUES ($1, $2)`,
      [uuidv4(), audio_id]
    );

    res.json({ message: 'Play logged successfully' });
  } catch (error) {
    console.error('Error logging play:', error);
    res.status(500).json({ error: 'Failed to log play' });
  }
});

// GET audio statistics
app.get('/audios/:audio_id/stats', async (req, res) => {
  const { audio_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        a.id, a.title, a.category,
        COUNT(apc.id) as total_plays,
        COUNT(DISTINCT apc.user_id) as unique_users,
        MAX(apc.played_at) as last_played
      FROM catalog.audios a
      LEFT JOIN catalog.audio_play_count apc ON a.id = apc.audio_id
      WHERE a.id = $1
      GROUP BY a.id, a.title, a.category`,
      [audio_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==========================================
// LOCAL CONTRIBUTIONS — Bons Plans Gaboma
// ==========================================

app.get('/contributions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM catalog.local_contributions ORDER BY upvotes DESC, created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

app.post('/contributions', async (req, res) => {
  const { user_id, author_name, place_name, category, tip_text } = req.body;
  if (!user_id || !place_name || !tip_text) {
    return res.status(400).json({ error: 'user_id, place_name, and tip_text are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO catalog.local_contributions (user_id, author_name, place_name, category, tip_text)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, author_name || 'Habitant de Libreville', place_name, category || 'Conseil Local', tip_text]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contribution:', error);
    res.status(500).json({ error: 'Failed to create contribution' });
  }
});

app.post('/contributions/:id/upvote', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const existing = await pool.query(
      'SELECT * FROM catalog.contribution_upvotes WHERE contribution_id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM catalog.contribution_upvotes WHERE id = $1', [existing.rows[0].id]);
      await pool.query('UPDATE catalog.local_contributions SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = $1', [id]);
      return res.json({ upvoted: false });
    }

    await pool.query('INSERT INTO catalog.contribution_upvotes (contribution_id, user_id) VALUES ($1, $2)', [id, user_id]);
    const updated = await pool.query('UPDATE catalog.local_contributions SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *', [id]);
    res.json({ upvoted: true, contribution: updated.rows[0] });
  } catch (error) {
    console.error('Error upvoting contribution:', error);
    res.status(500).json({ error: 'Failed to upvote contribution' });
  }
});

// ==========================================
// MISSIONS & DÉFIS LIBREVILLE
// ==========================================

app.get('/user-missions/:user_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM catalog.user_missions WHERE user_id = $1', [req.params.user_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user missions' });
  }
});

app.post('/user-missions', async (req, res) => {
  const { user_id, mission_id, completed } = req.body;
  if (!user_id || !mission_id) return res.status(400).json({ error: 'user_id and mission_id are required' });

  try {
    const result = await pool.query(
      `INSERT INTO catalog.user_missions (user_id, mission_id, completed_at, places_completed)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, mission_id) DO UPDATE SET completed_at = $3
       RETURNING *`,
      [user_id, mission_id, completed ? new Date() : null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user mission' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`Catalog Service running on port ${PORT}`);

  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection error:', err);
  }

  cache.connect();

  // L'index doit exister et refleter la base au demarrage, sinon /api/search renvoie du vide.
  const { indexed, skipped } = await search.reindexAll(pool);
  if (!skipped) console.log(`Elasticsearch: ${indexed} places indexed`);
});
