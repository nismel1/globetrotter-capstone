const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Analytics Service is running' });
});

// Log usage event
app.post('/events', async (req, res) => {
  const { user_id, event_type, metadata } = req.body;

  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  try {
    const eventId = uuidv4();
    await pool.query(
      `INSERT INTO analytics.usage_events (id, user_id, event_type, metadata, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [eventId, user_id || null, event_type, JSON.stringify(metadata || {})]
    );

    res.json({ message: 'Event logged' });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// Get dashboard metrics
app.get('/metrics', async (req, res) => {
  try {
    // Count unique visitors (users who logged in)
    const visitorsResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as visitor_count
       FROM analytics.usage_events
       WHERE event_type = 'login' AND timestamp > NOW() - INTERVAL '30 days'`
    );

    // Count published places
    const placesResult = await pool.query(
      'SELECT COUNT(*) as place_count FROM catalog.places WHERE status = $1',
      ['published']
    );

    // Count pending proposals
    const proposalsResult = await pool.query(
      'SELECT COUNT(*) as proposal_count FROM catalog.place_proposals WHERE status = $1',
      ['pending']
    );

    // Count total events
    const eventsResult = await pool.query(
      'SELECT COUNT(*) as event_count FROM catalog.events WHERE date >= NOW()'
    );

    // Count total users
    const usersResult = await pool.query('SELECT COUNT(*) as user_count FROM auth.users');

    // Get daily metrics
    const dailyResult = await pool.query(
      `SELECT 
        DATE(timestamp) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_events
       FROM analytics.usage_events
       WHERE timestamp > NOW() - INTERVAL '7 days'
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`
    );

    res.json({
      visitors_30d: parseInt(visitorsResult.rows[0]?.visitor_count || 0),
      total_places: parseInt(placesResult.rows[0]?.place_count || 0),
      pending_proposals: parseInt(proposalsResult.rows[0]?.proposal_count || 0),
      upcoming_events: parseInt(eventsResult.rows[0]?.event_count || 0),
      total_users: parseInt(usersResult.rows[0]?.user_count || 0),
      daily_metrics: dailyResult.rows
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get metrics for a specific date range
app.get('/metrics/range', async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  try {
    const result = await pool.query(
      `SELECT 
        DATE(timestamp) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_events
       FROM analytics.usage_events
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      [start_date, end_date]
    );

    res.json({ metrics: result.rows });
  } catch (error) {
    console.error('Error fetching metrics by range:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get popular places (by visits)
app.get('/popular-places', async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await pool.query(
      `SELECT 
        place_id,
        COUNT(*) as visit_count
       FROM analytics.usage_events
       WHERE event_type = 'place_visit'
       GROUP BY place_id
       ORDER BY visit_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({ popular_places: result.rows });
  } catch (error) {
    console.error('Error fetching popular places:', error);
    res.status(500).json({ error: 'Failed to fetch popular places' });
  }
});

// Get user engagement metrics
app.get('/engagement', async (req, res) => {
  try {
    // Users who have created itineraries
    const itineraryResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as users_with_itineraries
       FROM itinerary.itineraries`
    );

    // Users who have visited places
    const visitedResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as users_visited_places
       FROM auth.visited_places`
    );

    // Users who have favorited places
    const favoritesResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as users_with_favorites
       FROM auth.favorites`
    );

    // Users who have proposed places
    const proposedResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as users_proposed_places
       FROM catalog.place_proposals`
    );

    res.json({
      users_with_itineraries: parseInt(itineraryResult.rows[0]?.users_with_itineraries || 0),
      users_visited_places: parseInt(visitedResult.rows[0]?.users_visited_places || 0),
      users_with_favorites: parseInt(favoritesResult.rows[0]?.users_with_favorites || 0),
      users_proposed_places: parseInt(proposedResult.rows[0]?.users_proposed_places || 0)
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
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
  console.log(`Analytics Service running on port ${PORT}`);
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('Database connection error:', err);
    } else {
      console.log('Database connected successfully');
    }
  });
});
