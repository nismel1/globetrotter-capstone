const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Auth Service is running' });
});

// Register
app.post('/register', async (req, res) => {
  const { password, name } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Check if user exists
    const userExists = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();
    const createdAt = new Date();

    const initialRole = (email.toLowerCase().includes('admin') || (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())) ? 'admin' : 'user';

    // Create user
    await pool.query(
      'INSERT INTO auth.users (id, email, password_hash, full_name, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, email, hashedPassword, name, initialRole, createdAt]
    );

    // Create JWT token
    const token = jwt.sign({ id: userId, email, role: initialRole }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      id: userId,
      email,
      name,
      role: initialRole,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const result = await pool.query('SELECT id, email, full_name, role, password_hash FROM auth.users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, email, full_name as name, avatar_url, created_at FROM auth.users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user preferences
app.get('/users/:id/preferences', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM auth.user_preferences WHERE user_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Save user preferences (Quiz answers)
app.post('/users/:id/preferences', async (req, res) => {
  const { id } = req.params;
  const { time_available, interests, budget, travel_mode } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO auth.user_preferences (user_id, time_available, interests, budget, travel_mode)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
       time_available = $2, interests = $3, budget = $4, travel_mode = $5
       RETURNING *`,
      [id, time_available, JSON.stringify(interests), budget, travel_mode]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// Get user achievements
app.get('/users/:id/achievements', async (req, res) => {
  const { id } = req.params;

  try {
    let result = await pool.query(
      'SELECT * FROM auth.user_achievements WHERE user_id = $1 ORDER BY unlocked_at DESC',
      [id]
    );

    if (result.rows.length === 0) {
      // Auto-seed starter achievements for new explorer
      const defaultBadges = [
        { name: 'Premier Voyageur', icon: '🛂', description: 'Rejoint la communauté Globetrotter LBV' },
        { name: 'Explorateur LBV', icon: '🏛️', description: 'Découverte des lieux emblématiques' },
        { name: 'Chasseur de Souvenirs', icon: '📸', description: 'Ajout de souvenirs dans le carnet de voyage' },
      ];

      for (const badge of defaultBadges) {
        await pool.query(
          `INSERT INTO auth.user_achievements (id, user_id, name, icon, description, unlocked_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT DO NOTHING`,
          [uuidv4(), id, badge.name, badge.icon, badge.description]
        ).catch(() => {});
      }

      result = await pool.query(
        'SELECT * FROM auth.user_achievements WHERE user_id = $1 ORDER BY unlocked_at DESC',
        [id]
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get visited places
app.get('/users/:id/visited-places', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT v.place_id, v.visited_at, p.name, p.slug, p.description, p.cover_image_url AS cover_image, p.address, c.name as category_name
       FROM auth.visited_places v
       LEFT JOIN catalog.places p ON v.place_id::text = p.id::text
       LEFT JOIN catalog.categories c ON p.category_id = c.id
       WHERE v.user_id = $1
       ORDER BY v.visited_at DESC`,
      [id]
    );

    res.json({ visited_places: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching visited places:', error);
    res.status(500).json({ error: 'Failed to fetch visited places' });
  }
});

// Mark place as visited
app.post('/users/:id/visited-places', async (req, res) => {
  const { id } = req.params;
  const { place_id } = req.body;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO auth.visited_places (user_id, place_id, visited_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, place_id) DO UPDATE SET visited_at = NOW()
       RETURNING *`,
      [id, place_id]
    );

    res.json({ visited: result.rows[0] });
  } catch (error) {
    console.error('Error marking place as visited:', error);
    res.status(500).json({ error: 'Failed to mark place as visited' });
  }
});

// Get favorites
app.get('/users/:id/favorites', async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'undefined' || id === 'null') {
    return res.json({ favorites: [] });
  }

  try {
    // Cast explicite pour compatibilité avec les deux types (UUID et VARCHAR)
    const result = await pool.query(
      `SELECT f.place_id, f.added_at,
              p.name, p.slug, p.description, p.cover_image_url AS cover_image, p.price_level, p.rating,
              c.name as category_name
       FROM auth.favorites f
       LEFT JOIN catalog.places p ON f.place_id::text = p.id::text
       LEFT JOIN catalog.categories c ON p.category_id::text = c.id::text
       WHERE f.user_id::text = $1::text
       ORDER BY f.added_at DESC`,
      [id]
    );

    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add favorite
app.post('/users/:id/favorites', async (req, res) => {
  const { id } = req.params;
  const { place_id } = req.body;

  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ error: 'Valid user ID is required' });
  }

  if (!place_id) {
    return res.status(400).json({ error: 'place_id is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO auth.favorites (user_id, place_id, added_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [id, place_id]
    );

    res.json({ favorite: result.rows[0] });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove favorite
app.delete('/users/:id/favorites/:place_id', async (req, res) => {
  const { id, place_id } = req.params;

  if (!id || id === 'undefined' || id === 'null') {
    return res.json({ message: 'Favorite removed' });
  }

  try {
    await pool.query(
      'DELETE FROM auth.favorites WHERE user_id::text = $1::text AND place_id::text = $2::text',
      [id, place_id]
    );

    res.json({ message: 'Favorite removed' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// ==========================================
// ADVENTURE MEMORIES — Mon Histoire
// ==========================================

// GET all memories for a user
app.get('/users/:id/memories', async (req, res) => {
  const { id } = req.params;
  const { category, sort = 'visited_at', order = 'DESC', rating } = req.query;

  try {
    let query = `SELECT * FROM auth.adventure_memories WHERE user_id = $1`;
    const params = [id];

    if (category) {
      params.push(category);
      query += ` AND place_category = $${params.length}`;
    }
    if (rating) {
      params.push(parseInt(rating));
      query += ` AND rating = $${params.length}`;
    }

    const validSorts = ['visited_at', 'created_at', 'rating'];
    const sortCol = validSorts.includes(sort) ? sort : 'visited_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    const result = await pool.query(query, params);

    // Stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_memories,
        COUNT(photo_url) as memories_with_photo,
        ROUND(AVG(rating)::numeric, 1) as avg_rating
       FROM auth.adventure_memories WHERE user_id = $1`,
      [id]
    );

    res.json({
      memories: result.rows,
      count: result.rows.length,
      stats: statsResult.rows[0],
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// GET memory count (for "adventure #N" numbering)
app.get('/users/:id/memories/count', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM auth.adventure_memories WHERE user_id = $1',
      [id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to count memories' });
  }
});

// GET single memory for a specific place (check if memory exists)
app.get('/users/:id/memories/place/:place_id', async (req, res) => {
  const { id, place_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM auth.adventure_memories WHERE user_id = $1 AND place_id = $2',
      [id, place_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No memory for this place' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

// GET single memory by id
app.get('/users/:id/memories/:memory_id', async (req, res) => {
  const { id, memory_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM auth.adventure_memories WHERE id = $1 AND user_id = $2',
      [memory_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

app.get('/admin/users', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  try {
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM auth.users');
    const result = await pool.query(
      'SELECT id, email, full_name, role, is_active, created_at, last_login_at FROM auth.users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({ items: result.rows, total: parseInt(countResult.rows[0].total, 10), count: result.rows.length });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.patch('/admin/users/:id/status', async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active must be a boolean' });
  try {
    const result = await pool.query(
      'UPDATE auth.users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role, is_active',
      [is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

app.patch('/admin/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be user or admin' });
  try {
    const result = await pool.query(
      'UPDATE auth.users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, is_active',
      [role, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

const badgeFields = ['name', 'description', 'icon_url', 'requirement_count', 'category'];

app.get('/admin/badges', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM auth.badges ORDER BY created_at DESC');
    res.json({ items: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

app.post('/admin/badges', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'name is required' });
  try {
    const values = badgeFields.map(field => req.body[field] ?? null);
    const result = await pool.query(
      `INSERT INTO auth.badges (${badgeFields.join(', ')}) VALUES (${badgeFields.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      values
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

app.put('/admin/badges/:id', async (req, res) => {
  const fields = badgeFields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field));
  if (!fields.length) return res.status(400).json({ error: 'No editable fields provided' });
  try {
    const values = [...fields.map(field => req.body[field]), req.params.id];
    const result = await pool.query(`UPDATE auth.badges SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Badge not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

app.delete('/admin/badges/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM auth.badges WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Badge not found' });
    res.status(204).send();
  } catch (error) {
    res.status(error.code === '23503' ? 409 : 500).json({ error: error.code === '23503' ? 'This badge is already assigned and cannot be deleted.' : 'Failed to delete badge' });
  }
});

// POST create a memory (also marks place as visited if not already)
app.post('/users/:id/memories', async (req, res) => {
  const { id } = req.params;
  const { place_id, place_name, place_category, photo_url, memory_text, favorite_part, rating, visited_at } = req.body;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id is required' });
  }

  try {
    // Also mark as visited (upsert)
    await pool.query(
      `INSERT INTO auth.visited_places (user_id, place_id, visited_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, place_id) DO UPDATE SET visited_at = EXCLUDED.visited_at`,
      [id, place_id, visited_at || new Date()]
    );

    // Create or update memory
    const result = await pool.query(
      `INSERT INTO auth.adventure_memories 
       (user_id, place_id, place_name, place_category, photo_url, memory_text, favorite_part, rating, visited_at, privacy, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'private', NOW(), NOW())
       ON CONFLICT (user_id, place_id) DO UPDATE SET
         place_name = EXCLUDED.place_name,
         place_category = EXCLUDED.place_category,
         photo_url = EXCLUDED.photo_url,
         memory_text = EXCLUDED.memory_text,
         favorite_part = EXCLUDED.favorite_part,
         rating = EXCLUDED.rating,
         visited_at = EXCLUDED.visited_at,
         updated_at = NOW()
       RETURNING *`,
      [id, place_id, place_name || null, place_category || null, photo_url || null, memory_text || null, favorite_part || null, rating || null, visited_at || new Date()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

// PUT update a memory
app.put('/users/:id/memories/:memory_id', async (req, res) => {
  const { id, memory_id } = req.params;
  const { photo_url, memory_text, favorite_part, rating, visited_at } = req.body;

  try {
    const result = await pool.query(
      `UPDATE auth.adventure_memories SET
         photo_url = COALESCE($1, photo_url),
         memory_text = COALESCE($2, memory_text),
         favorite_part = COALESCE($3, favorite_part),
         rating = COALESCE($4, rating),
         visited_at = COALESCE($5, visited_at),
         updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [photo_url || null, memory_text || null, favorite_part || null, rating || null, visited_at || null, memory_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

// DELETE a memory (does NOT remove visited_place)
app.delete('/users/:id/memories/:memory_id', async (req, res) => {
  const { id, memory_id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM auth.adventure_memories WHERE id = $1 AND user_id = $2 RETURNING id',
      [memory_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found or unauthorized' });
    }

    res.json({ message: 'Memory deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function bootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Administrateur Globetrotter' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('Admin bootstrap skipped: ADMIN_EMAIL and ADMIN_PASSWORD are not configured.');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  await pool.query(
    `INSERT INTO auth.users (email, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, 'admin', true)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = 'admin',
       is_active = true,
       updated_at = NOW()`,
    [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
  );
  await pool.query(
    `UPDATE auth.users SET role = 'admin' WHERE email ILIKE '%admin%' AND role != 'admin'`
  );
  console.log(`Admin account ready: ${ADMIN_EMAIL}`);
}

async function start() {
  try {
    await pool.query('SELECT NOW()');
    await bootstrapAdmin();
    app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
  } catch (error) {
    console.error('Auth service startup failed:', error);
    process.exit(1);
  }
}

start();
