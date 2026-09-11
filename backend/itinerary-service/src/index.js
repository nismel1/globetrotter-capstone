const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Itinerary Service is running' });
});

// Create itinerary
app.post('/itineraries', async (req, res) => {
  const { user_id, title, description, start_date, end_date, quiz_answers } = req.body;

  if (!user_id || !title || !start_date) {
    return res.status(400).json({ error: 'user_id, title, and start_date are required' });
  }

  try {
    const itineraryId = uuidv4();
    const result = await pool.query(
      `INSERT INTO itinerary.itineraries 
        (id, user_id, name, description, start_date, end_date, created_from_quiz, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
            [itineraryId, user_id, title, description || null, start_date, end_date || null, Boolean(quiz_answers)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(500).json({ error: 'Failed to create itinerary' });
  }
});

// Get itinerary by ID
app.get('/itineraries/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const itineraryResult = await pool.query(
      'SELECT * FROM itinerary.itineraries WHERE id = $1',
      [id]
    );

    if (itineraryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    // Get days for this itinerary
    const daysResult = await pool.query(
      'SELECT * FROM itinerary.itinerary_days WHERE itinerary_id = $1 ORDER BY day_number',
      [id]
    );

    const itinerary = itineraryResult.rows[0];
    itinerary.days = daysResult.rows;

    // For each day, get activities with place details
    for (let day of itinerary.days) {
      const activitiesResult = await pool.query(
        `SELECT a.*, p.name as place_name, p.cover_image_url AS cover_image, p.address
         FROM itinerary.itineraries_activities a
         LEFT JOIN catalog.places p ON a.place_id = p.id
         WHERE a.day_id = $1 ORDER BY a.time`,
        [day.id]
      ).catch(async () => {
        return await pool.query(
          `SELECT a.*, p.name as place_name, p.cover_image_url AS cover_image, p.address
           FROM itinerary.itinerary_activities a
           LEFT JOIN catalog.places p ON a.place_id = p.id
           WHERE a.day_id = $1 ORDER BY a.time`,
          [day.id]
        );
      });
      day.activities = activitiesResult.rows;
    }

    res.json(itinerary);
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary' });
  }
});

app.post('/itineraries/:id/share', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE itinerary.itineraries SET share_token = COALESCE(share_token, $1), is_published = true, updated_at = NOW() WHERE id = $2 RETURNING share_token',
      [uuidv4(), req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Itinerary not found' });
    res.json({ share_token: result.rows[0].share_token });
  } catch (error) {
    console.error('Error sharing itinerary:', error);
    res.status(500).json({ error: 'Failed to share itinerary' });
  }
});

app.get('/public/itineraries/:shareToken', async (req, res) => {
  try {
    const itineraryResult = await pool.query(
      'SELECT id, name AS title, description, start_date, end_date FROM itinerary.itineraries WHERE share_token = $1 AND is_published = true',
      [req.params.shareToken]
    );
    if (!itineraryResult.rows.length) return res.status(404).json({ error: 'Shared itinerary not found' });
    const itinerary = itineraryResult.rows[0];
    const daysResult = await pool.query('SELECT id, day_number, date, title, notes FROM itinerary.itinerary_days WHERE itinerary_id = $1 ORDER BY day_number', [itinerary.id]);
    itinerary.days = daysResult.rows;
    for (const day of itinerary.days) {
      const activitiesResult = await pool.query(
        `SELECT a.*, p.name AS place_name, p.cover_image_url AS cover_image
         FROM itinerary.itinerary_activities a LEFT JOIN catalog.places p ON a.place_id = p.id
         WHERE a.itinerary_day_id = $1 ORDER BY a.activity_order`,
        [day.id]
      );
      day.activities = activitiesResult.rows;
    }
    res.json(itinerary);
  } catch (error) {
    console.error('Error fetching shared itinerary:', error);
    res.status(500).json({ error: 'Failed to fetch shared itinerary' });
  }
});

// Get user's itineraries
app.get('/users/:user_id/itineraries', async (req, res) => {
  const { user_id } = req.params;

  if (!user_id || user_id === 'undefined' || user_id === 'null') {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      'SELECT id, name AS title, description, start_date, end_date, created_at FROM itinerary.itineraries WHERE user_id::text = $1::text ORDER BY created_at DESC',
      [user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user itineraries:', error);
    res.status(500).json({ error: 'Failed to fetch itineraries' });
  }
});

// Add a day to itinerary
app.post('/itineraries/:itinerary_id/days', async (req, res) => {
  const { itinerary_id } = req.params;
  const { day_number, date } = req.body;

  if (!day_number || !date) {
    return res.status(400).json({ error: 'day_number and date are required' });
  }

  try {
    const dayId = uuidv4();
    const result = await pool.query(
      `INSERT INTO itinerary.itinerary_days (id, itinerary_id, day_number, date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dayId, itinerary_id, day_number, date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding day:', error);
    res.status(500).json({ error: 'Failed to add day' });
  }
});

// Add activity to day
app.post('/days/:day_id/activities', async (req, res) => {
  const { day_id } = req.params;
  const { place_id, time, duration_minutes, notes } = req.body;

  if (!place_id || !time) {
    return res.status(400).json({ error: 'place_id and time are required' });
  }

  try {
    const activityId = uuidv4();
    const result = await pool.query(
      `INSERT INTO itinerary.itinerary_activities 
       (id, day_id, place_id, time, duration_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [activityId, day_id, place_id, time, duration_minutes || 60, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// Update activity
app.put('/activities/:id', async (req, res) => {
  const { id } = req.params;
  const { time, duration_minutes, notes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE itinerary.itinerary_activities 
       SET time = COALESCE($1, time), duration_minutes = COALESCE($2, duration_minutes), notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [time || null, duration_minutes || null, notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Delete activity
app.delete('/activities/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM itinerary.itinerary_activities WHERE id = $1', [id]);
    res.json({ message: 'Activity deleted' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// Generate itinerary from quiz answers
app.post('/itineraries/generate', async (req, res) => {
  const { user_id, quiz_answers } = req.body;

  if (!user_id || !quiz_answers) {
    return res.status(400).json({ error: 'user_id and quiz_answers are required' });
  }

  try {
    const dayCount = 5;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + dayCount);

    const itineraryId = uuidv4();
    const itineraryResult = await pool.query(
      `INSERT INTO itinerary.itineraries 
       (id, user_id, title, description, start_date, end_date, quiz_answers, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        itineraryId,
        user_id,
        `Itinéraire — Libreville & Côte Gabonaise`,
        `Généré sur mesure selon votre profil d'exploration`,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        JSON.stringify(quiz_answers)
      ]
    );

    // Fetch places from database to seed activities
    const placesResult = await pool.query('SELECT id, name FROM catalog.places LIMIT 10').catch(() => ({ rows: [] }));
    const places = placesResult.rows;

    const dayLocations = [
      'Centre-Ville & Glass',
      'Presqu’île Pointe-Denis',
      'Cap Estérias',
      'Parc National d’Akanda',
      'Marché du Mont-Bouët'
    ];

    for (let i = 0; i < dayCount; i++) {
      const dayId = uuidv4();
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);

      await pool.query(
        `INSERT INTO itinerary.itinerary_days (id, itinerary_id, day_number, date)
         VALUES ($1, $2, $3, $4)`,
        [dayId, itineraryId, i + 1, dayDate.toISOString().split('T')[0]]
      );

      if (places.length > 0) {
        const place1 = places[i % places.length];
        const place2 = places[(i + 1) % places.length];

        await pool.query(
          `INSERT INTO itinerary.itinerary_activities (id, day_id, place_id, time, duration_minutes, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), dayId, place1.id, '09:30', 90, `Exploration guidée de ${place1.name}`]
        );

        if (place2 && place2.id !== place1.id) {
          await pool.query(
            `INSERT INTO itinerary.itinerary_activities (id, day_id, place_id, time, duration_minutes, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), dayId, place2.id, '14:30', 120, `Visite immersive de ${place2.name}`]
          );
        }
      }
    }

    res.status(201).json(itineraryResult.rows[0]);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({ error: 'Failed to generate itinerary' });
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

app.listen(PORT, () => {
  console.log(`Itinerary Service running on port ${PORT}`);
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('Database connection error:', err);
    } else {
      console.log('Database connected successfully');
    }
  });
});
