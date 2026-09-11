const axios = require('axios');

const ES_URL = (process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200').replace(/\/$/, '');
const ES_INDEX = process.env.ELASTICSEARCH_INDEX || 'globetrotter_places';
const ES_ENABLED = process.env.ELASTICSEARCH_ENABLED !== 'false';

const es = axios.create({ baseURL: ES_URL, timeout: 5000 });

// Doit rester aligné sur la requête multi_match de l'api-gateway.
const INDEX_DEFINITION = {
  settings: {
    analysis: {
      filter: {
        french_stop: { type: 'stop', stopwords: '_french_' },
        french_stemmer: { type: 'stemmer', language: 'light_french' },
      },
      analyzer: {
        french_custom: {
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'french_stop', 'french_stemmer'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text', analyzer: 'french_custom' },
      description: { type: 'text', analyzer: 'french_custom' },
      long_description: { type: 'text', analyzer: 'french_custom' },
      address: { type: 'text', analyzer: 'french_custom' },
      category_name: { type: 'text', analyzer: 'french_custom' },
      cover_image: { type: 'keyword', index: false },
      rating: { type: 'float' },
      price_level: { type: 'integer' },
      latitude: { type: 'float' },
      longitude: { type: 'float' },
      location: { type: 'geo_point' },
      status: { type: 'keyword' },
      indexed_at: { type: 'date' },
    },
  },
};

function toDocument(place) {
  const lat = place.latitude !== null && place.latitude !== undefined ? Number(place.latitude) : null;
  const lon = place.longitude !== null && place.longitude !== undefined ? Number(place.longitude) : null;

  return {
    id: place.id,
    name: place.name || '',
    description: place.description || '',
    long_description: place.long_description || '',
    address: place.address || '',
    category_name: place.category_name || '',
    cover_image: place.cover_image_url || '',
    rating: place.rating !== null && place.rating !== undefined ? Number(place.rating) : null,
    price_level: place.price_level !== null && place.price_level !== undefined ? Number(place.price_level) : null,
    latitude: lat,
    longitude: lon,
    location: lat !== null && lon !== null ? { lat, lon } : null,
    status: place.is_published === false ? 'unpublished' : 'published',
    indexed_at: new Date().toISOString(),
  };
}

async function ensureIndex() {
  if (!ES_ENABLED) return false;
  try {
    await es.head(`/${ES_INDEX}`);
    return true;
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error('[es] index check failed:', error.message);
      return false;
    }
  }
  try {
    await es.put(`/${ES_INDEX}`, INDEX_DEFINITION);
    console.log(`[es] index "${ES_INDEX}" created`);
    return true;
  } catch (error) {
    console.error('[es] index creation failed:', error.response?.data || error.message);
    return false;
  }
}

// L'indexation ne doit jamais faire échouer la requête HTTP appelante.
async function indexPlace(place) {
  if (!ES_ENABLED || !place?.id) return;
  try {
    await es.put(`/${ES_INDEX}/_doc/${encodeURIComponent(place.id)}`, toDocument(place));
  } catch (error) {
    console.error(`[es] indexing place ${place.id} failed:`, error.response?.data || error.message);
  }
}

async function removePlace(id) {
  if (!ES_ENABLED || !id) return;
  try {
    await es.delete(`/${ES_INDEX}/_doc/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(`[es] deleting place ${id} failed:`, error.response?.data || error.message);
    }
  }
}

const PLACE_WITH_CATEGORY_SQL = `
  SELECT p.*, c.name AS category_name
  FROM catalog.places p
  LEFT JOIN catalog.categories c ON c.id = p.category_id
`;

async function indexPlaceById(pool, id) {
  if (!ES_ENABLED || !id) return;
  try {
    const { rows } = await pool.query(`${PLACE_WITH_CATEGORY_SQL} WHERE p.id = $1`, [id]);
    if (rows.length) await indexPlace(rows[0]);
  } catch (error) {
    console.error(`[es] loading place ${id} for indexing failed:`, error.message);
  }
}

async function reindexAll(pool) {
  if (!ES_ENABLED) return { indexed: 0, skipped: true };
  const ready = await ensureIndex();
  if (!ready) return { indexed: 0, skipped: true };

  let rows;
  try {
    ({ rows } = await pool.query(`${PLACE_WITH_CATEGORY_SQL} WHERE p.is_published = true`));
  } catch (error) {
    console.error('[es] reindex aborted, database unavailable:', error.message);
    return { indexed: 0, error: true };
  }

  if (!rows.length) return { indexed: 0 };

  const bulk = rows
    .map((place) => `${JSON.stringify({ index: { _index: ES_INDEX, _id: place.id } })}\n${JSON.stringify(toDocument(place))}`)
    .join('\n');

  try {
    const { data } = await es.post('/_bulk', `${bulk}\n`, {
      headers: { 'Content-Type': 'application/x-ndjson' },
      timeout: 30000,
    });
    if (data.errors) console.error('[es] bulk reindex reported item-level errors');
    return { indexed: rows.length };
  } catch (error) {
    console.error('[es] bulk reindex failed:', error.response?.data || error.message);
    return { indexed: 0, error: true };
  }
}

async function ping() {
  if (!ES_ENABLED) return false;
  try {
    await es.get('/_cluster/health', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { ES_INDEX, ES_ENABLED, ensureIndex, indexPlace, indexPlaceById, removePlace, reindexAll, ping };
