const amqp = require('amqplib');

const RABBITMQ_USER = process.env.RABBITMQ_USER || 'globetrotter';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'globetrotter_rabbitmq_password';
const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672`;
const EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'globetrotter.events';
const QUEUE = 'notification.group-events';
const ENABLED = process.env.RABBITMQ_ENABLED !== 'false';

let connection = null;
let channel = null;

// Les événements du bus doivent devenir des notifications persistées + poussées en WS.
async function start({ pool, createNotification }) {
  if (!ENABLED) return;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on('error', (err) => console.error('[amqp]', err.message));
    connection.on('close', () => {
      channel = null;
      connection = null;
      setTimeout(() => start({ pool, createNotification }), 5000);
    });

    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, 'group.*');
    await channel.prefetch(20);

    await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const { event, data } = JSON.parse(msg.content.toString());
        await handleEvent({ pool, createNotification }, event, data || {});
        channel.ack(msg);
      } catch (error) {
        console.error('[amqp] message handling failed:', error.message);
        // Pas de requeue : un message invalide boucle sinon indéfiniment.
        channel.nack(msg, false, false);
      }
    });

    console.log(`[amqp] consuming "${QUEUE}" bound to ${EXCHANGE}/group.*`);
  } catch (error) {
    console.error('[amqp] connection failed, retrying in 5s:', error.message);
    channel = null;
    connection = null;
    setTimeout(() => start({ pool, createNotification }), 5000);
  }
}

async function groupMembers(pool, groupId, excludeUserId) {
  const { rows } = await pool.query(
    'SELECT user_id FROM groups.group_members WHERE group_id = $1 AND user_id <> COALESCE($2, \'\')',
    [groupId, excludeUserId || null]
  );
  return rows.map((r) => r.user_id);
}

async function handleEvent({ pool, createNotification }, event, data) {
  if (!data.group_id) return;

  const targets = await groupMembers(pool, data.group_id, data.user_id || data.created_by_user_id);
  if (!targets.length) return;

  const templates = {
    'group.member.joined': {
      type: 'group_invitation',
      title: 'Nouveau membre dans le groupe',
      body: 'Un voyageur vient de rejoindre votre groupe.',
    },
    'group.vote.changed': {
      type: 'group_vote',
      title: 'Nouveau vote dans le groupe',
      body: 'Un membre a voté pour un lieu.',
    },
    'group.expense.created': {
      type: 'system',
      title: 'Nouvelle dépense partagée',
      body: data.title ? `Dépense ajoutée : ${data.title}` : 'Une dépense a été ajoutée au groupe.',
    },
    'group.archived': {
      type: 'system',
      title: 'Groupe archivé',
      body: 'Un groupe dont vous êtes membre a été archivé.',
    },
  };

  const template = templates[event];
  if (!template) return;
  if (event === 'group.vote.changed' && data.voted === false) return;

  await Promise.all(
    targets.map((userId) =>
      createNotification({
        user_id: userId,
        type: template.type,
        title: template.title,
        body: template.body,
        data: { group_id: data.group_id, event },
      }).catch((error) => console.error('[amqp] notification creation failed:', error.message))
    )
  );
}

function isReady() {
  return Boolean(channel);
}

module.exports = { start, isReady, EXCHANGE, QUEUE, ENABLED };
