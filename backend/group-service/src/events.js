const amqp = require('amqplib');

const RABBITMQ_USER = process.env.RABBITMQ_USER || 'globetrotter';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'globetrotter_rabbitmq_password';
const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672`;
const EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'globetrotter.events';
const ENABLED = process.env.RABBITMQ_ENABLED !== 'false';

let connection = null;
let channel = null;
let connecting = false;

async function connect() {
  if (!ENABLED || connecting || channel) return;
  connecting = true;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on('error', (err) => console.error('[amqp]', err.message));
    connection.on('close', () => {
      channel = null;
      connection = null;
      setTimeout(connect, 5000);
    });
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log(`[amqp] connected, exchange "${EXCHANGE}" ready`);
  } catch (error) {
    console.error('[amqp] connection failed, retrying in 5s:', error.message);
    channel = null;
    connection = null;
    setTimeout(connect, 5000);
  } finally {
    connecting = false;
  }
}

// Publication best-effort : une panne du bus ne doit pas casser la requête HTTP.
function publish(routingKey, payload) {
  if (!ENABLED || !channel) return false;
  try {
    return channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify({ event: routingKey, emitted_at: new Date().toISOString(), data: payload })),
      { persistent: true, contentType: 'application/json' }
    );
  } catch (error) {
    console.error('[amqp] publish failed:', error.message);
    return false;
  }
}

function isReady() {
  return Boolean(channel);
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch { /* ignore */ }
  channel = null;
  connection = null;
}

module.exports = { connect, publish, isReady, close, EXCHANGE, ENABLED };
