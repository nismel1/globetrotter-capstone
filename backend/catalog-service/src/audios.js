const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'globetrotter@ernis',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

// GET all active audios
router.get('/', async (req, res) => {
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
router.get('/:audio_id', async (req, res) => {
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

// POST create audio (requires admin context)
router.post('/', async (req, res) => {
  const { title, description, audio_url, thumbnail_url, duration_seconds, category } = req.body;
  const userId = req.user?.id; // From authentication middleware

  if (!title || !audio_url) {
    return res.status(400).json({ error: 'Title and audio_url are required' });
  }

  try {
    const audioId = uuidv4();
    await pool.query(
      `INSERT INTO catalog.audios (id, title, description, audio_url, thumbnail_url, duration_seconds, category, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [audioId, title, description || null, audio_url, thumbnail_url || null, duration_seconds || null, category || 'ambient', userId]
    );

    res.status(201).json({
      id: audioId,
      title,
      description,
      audio_url,
      thumbnail_url,
      duration_seconds,
      category,
      message: 'Audio created successfully',
    });
  } catch (error) {
    console.error('Error creating audio:', error);
    res.status(500).json({ error: 'Failed to create audio' });
  }
});

// PUT update audio
router.put('/:audio_id', async (req, res) => {
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

// DELETE audio
router.delete('/:audio_id', async (req, res) => {
  const { audio_id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE catalog.audios SET is_active = false WHERE id = $1 RETURNING id',
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

// POST log audio play (for analytics)
router.post('/:audio_id/play', async (req, res) => {
  const { audio_id } = req.params;
  const userId = req.user?.id; // Can be null for anonymous

  try {
    await pool.query(
      `INSERT INTO catalog.audio_play_count (id, audio_id, user_id) VALUES ($1, $2, $3)`,
      [uuidv4(), audio_id, userId || null]
    );

    res.json({ message: 'Play logged successfully' });
  } catch (error) {
    console.error('Error logging play:', error);
    res.status(500).json({ error: 'Failed to log play' });
  }
});

// GET audio statistics (admin)
router.get('/:audio_id/stats', async (req, res) => {
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

module.exports = router;
