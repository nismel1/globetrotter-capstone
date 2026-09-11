const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});

// Service URLs
const catalogServiceUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3002';
const itineraryServiceUrl = process.env.ITINERARY_SERVICE_URL || 'http://itinerary-service:3003';

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Recommendation Service is running' });
});

app.get('/weather', async (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) return res.status(400).json({ error: 'latitude and longitude are required' });
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: { latitude, longitude, current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m', timezone: 'auto' },
      timeout: 8000,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Weather request failed:', error.message);
    res.status(502).json({ error: 'Weather provider unavailable' });
  }
});

// Get recommendations based on user profile
app.get('/recommendations/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { limit = 5, category_id, max_price_level, latitude, longitude } = req.query;

  try {
    // Get user preferences from auth service (through catalog)
    // For MVP: simple recommendation based on interests from quiz
    
    // Fetch all places
    const placesResponse = await axios.get(`${catalogServiceUrl}/places?limit=100`);
    const allPlaces = placesResponse.data.places || [];

    // Get user's visited places
    const visitedResult = await pool.query(
      'SELECT place_id FROM auth.visited_places WHERE user_id = $1',
      [user_id]
    );
    const visitedPlaceIds = visitedResult.rows.map(row => row.place_id);

    // Filter out visited places
    const unvisitedPlaces = allPlaces.filter(place => {
      if (visitedPlaceIds.includes(place.id)) return false;
      if (category_id && place.category_id !== category_id) return false;
      if (max_price_level && place.price_level && place.price_level !== max_price_level) return false;
      return true;
    });

    // Sort by rating (MVP scoring)
    const recommendations = unvisitedPlaces
      .map(place => {
        let score = Number(place.rating || 0);
        if (latitude && longitude && place.latitude && place.longitude) {
          const distance = Math.hypot(Number(place.latitude) - Number(latitude), Number(place.longitude) - Number(longitude));
          score += Math.max(0, 2 - distance);
        }
        return { ...place, recommendation_score: Number(score.toFixed(3)) };
      })
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, parseInt(limit));

    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Log user interaction for analytics
app.post('/interactions', async (req, res) => {
  const { user_id, place_id, action_type } = req.body;

  if (!user_id || !action_type) {
    return res.status(400).json({ error: 'user_id and action_type are required' });
  }

  try {
    const logId = uuidv4();
    await pool.query(
      `INSERT INTO recommendation.recommendation_logs (id, user_id, place_id, recommendation_type, shown_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [logId, user_id, place_id, action_type]
    );

    res.json({ message: 'Interaction logged' });
  } catch (error) {
    console.error('Error logging interaction:', error);
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

// Get trending places
app.get('/trending', async (req, res) => {
  const { limit = 5 } = req.query;

  try {
    const result = await pool.query(
      `SELECT place_id, COUNT(*) as visit_count
       FROM recommendation.recommendation_logs
      WHERE recommendation_type = 'visit' AND shown_at > NOW() - INTERVAL '30 days'
       GROUP BY place_id
       ORDER BY visit_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    const placeIds = result.rows.map(row => row.place_id);

    // Get place details from catalog
    const placesResponse = await axios.get(`${catalogServiceUrl}/places?limit=100`);
    const allPlaces = placesResponse.data.places || [];
    const trendingPlaces = allPlaces.filter(place => placeIds.includes(place.id));

    res.json({ trending: trendingPlaces });
  } catch (error) {
    console.error('Error getting trending places:', error);
    res.status(500).json({ error: 'Failed to get trending places' });
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
  console.log(`Recommendation Service running on port ${PORT}`);
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('Database connection error:', err);
    } else {
      console.log('Database connected successfully');
    }
  });
});
