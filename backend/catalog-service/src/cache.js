const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const ENABLED = process.env.REDIS_ENABLED !== 'false';

let client = null;
let ready = false;

function connect() {
  if (!ENABLED || client) return;
  client = createClient({
    url: REDIS_URL,
    socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 5000) },
  });
  client.on('error', (err) => {
    ready = false;
    console.error('[redis]', err.message);
  });
  client.on('ready', () => {
    ready = true;
    console.log('[redis] connected');
  });
  client.connect().catch((err) => console.error('[redis] initial connection failed:', err.message));
}

// Le cache est best-effort : toute panne Redis doit dégrader, pas casser.
async function get(key) {
  if (!ready) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('[redis] get failed:', error.message);
    return null;
  }
}

async function set(key, value, ttlSeconds = 300) {
  if (!ready) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error('[redis] set failed:', error.message);
  }
}

async function del(...keys) {
  if (!ready || !keys.length) return;
  try {
    await client.del(keys);
  } catch (error) {
    console.error('[redis] del failed:', error.message);
  }
}

async function invalidatePrefix(prefix) {
  if (!ready) return;
  try {
    for await (const key of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 200 })) {
      await client.del(key);
    }
  } catch (error) {
    console.error('[redis] invalidatePrefix failed:', error.message);
  }
}

function isReady() {
  return ready;
}

async function close() {
  if (client) {
    try { await client.quit(); } catch { /* ignore */ }
    client = null;
    ready = false;
  }
}

module.exports = { connect, get, set, del, invalidatePrefix, isReady, close, ENABLED };
