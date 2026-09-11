const express = require('express');
const { Pool } = require('pg');
const { randomBytes } = require('crypto');
const cache = require('./cache');
const events = require('./events');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;
const GROUP_CACHE_PREFIX = 'groups:';
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globetrotter',
});
app.use(express.json());

async function invalidateGroup(groupId) {
  await cache.del(`${GROUP_CACHE_PREFIX}detail:${groupId}`, `${GROUP_CACHE_PREFIX}expenses:${groupId}`);
  await cache.invalidatePrefix(`${GROUP_CACHE_PREFIX}list:`);
}

app.get('/health', (_req, res) => res.json({
  status: 'Group Service is running',
  redis: cache.isReady() ? 'up' : 'down',
  rabbitmq: events.isReady() ? 'up' : 'down',
}));

app.post('/groups', async (req, res) => {
  const { user_id, name, description, expires_at } = req.body;
  if (!user_id || !name) return res.status(400).json({ error: 'user_id and name are required' });
  try {
    const result = await pool.query(
      `INSERT INTO groups.groups (created_by_user_id, name, description, invitation_code, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, name, description || null, randomBytes(5).toString('hex').toUpperCase(), expires_at || null]
    );
    await pool.query('INSERT INTO groups.group_members (group_id, user_id) VALUES ($1, $2)', [result.rows[0].id, user_id]);

    await cache.invalidatePrefix(`${GROUP_CACHE_PREFIX}list:`);
    events.publish('group.created', { group_id: result.rows[0].id, name: result.rows[0].name, created_by_user_id: user_id });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.get('/groups', async (req, res) => {
  try {
    const cacheKey = `${GROUP_CACHE_PREFIX}list:${req.query.user_id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query(
      `SELECT g.*, COUNT(gm.user_id)::int AS member_count
       FROM groups.groups g JOIN groups.group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1 AND g.is_active = true GROUP BY g.id ORDER BY g.created_at DESC`,
      [req.query.user_id]
    );
    await cache.set(cacheKey, result.rows, 60);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch groups' }); }
});

app.post('/groups/join', async (req, res) => {
  const { user_id, invitation_code } = req.body;
  if (!user_id || !invitation_code) return res.status(400).json({ error: 'user_id and invitation_code are required' });
  try {
    const group = await pool.query("SELECT * FROM groups.groups WHERE invitation_code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())", [invitation_code.toUpperCase()]);
    if (!group.rows.length) return res.status(404).json({ error: 'Invalid or expired invitation code' });
    const result = await pool.query('INSERT INTO groups.group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *', [group.rows[0].id, user_id]);

    await invalidateGroup(group.rows[0].id);
    if (result.rows[0]) {
      events.publish('group.member.joined', { group_id: group.rows[0].id, group_name: group.rows[0].name, user_id });
    }

    res.status(201).json({ group: group.rows[0], membership: result.rows[0] || null });
  } catch (error) { res.status(500).json({ error: 'Failed to join group' }); }
});

app.get('/groups/:id', async (req, res) => {
  try {
    const cacheKey = `${GROUP_CACHE_PREFIX}detail:${req.params.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const group = await pool.query('SELECT * FROM groups.groups WHERE id = $1 AND is_active = true', [req.params.id]);
    if (!group.rows.length) return res.status(404).json({ error: 'Group not found' });
    const [members, votes, expenses] = await Promise.all([
      pool.query('SELECT * FROM groups.group_members WHERE group_id = $1 ORDER BY joined_at', [req.params.id]),
      pool.query(`SELECT place_id, COUNT(*)::int AS vote_count, ARRAY_AGG(user_id) AS voter_ids FROM groups.group_votes WHERE group_id = $1 GROUP BY place_id ORDER BY vote_count DESC`, [req.params.id]),
      pool.query('SELECT * FROM groups.group_expenses WHERE group_id = $1 ORDER BY created_at DESC', [req.params.id]),
    ]);
    const payload = { ...group.rows[0], members: members.rows, votes: votes.rows, expenses: expenses.rows };
    await cache.set(cacheKey, payload, 60);
    res.json(payload);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch group' }); }
});

app.post('/groups/:id/expenses', async (req, res) => {
  const { user_id, title, amount } = req.body;
  if (!user_id || !title || !amount) return res.status(400).json({ error: 'user_id, title, and amount are required' });
  try {
    const result = await pool.query(
      'INSERT INTO groups.group_expenses (group_id, paid_by_user_id, title, amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, user_id, title, parseFloat(amount)]
    );

    await invalidateGroup(req.params.id);
    events.publish('group.expense.created', { group_id: req.params.id, expense_id: result.rows[0].id, user_id, title, amount: result.rows[0].amount });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.get('/groups/:id/expenses', async (req, res) => {
  try {
    const cacheKey = `${GROUP_CACHE_PREFIX}expenses:${req.params.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM groups.group_expenses WHERE group_id = $1 ORDER BY created_at DESC', [req.params.id]);
    await cache.set(cacheKey, result.rows, 60);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch expenses' }); }
});

app.delete('/groups/:id/expenses/:expense_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM groups.group_expenses WHERE id = $1 AND group_id = $2', [req.params.expense_id, req.params.id]);

    await invalidateGroup(req.params.id);
    events.publish('group.expense.deleted', { group_id: req.params.id, expense_id: req.params.expense_id });

    res.json({ message: 'Expense deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete expense' }); }
});

app.post('/groups/:id/votes', async (req, res) => {
  const { user_id, place_id } = req.body;
  if (!user_id || !place_id) return res.status(400).json({ error: 'user_id and place_id are required' });
  try {
    const membership = await pool.query('SELECT 1 FROM groups.group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, user_id]);
    if (!membership.rows.length) return res.status(403).json({ error: 'User is not a group member' });
    const existing = await pool.query('SELECT * FROM groups.group_votes WHERE group_id = $1 AND user_id = $2 AND place_id = $3', [req.params.id, user_id, place_id]);
    if (existing.rows.length) {
      await pool.query('DELETE FROM groups.group_votes WHERE id = $1', [existing.rows[0].id]);
      await invalidateGroup(req.params.id);
      events.publish('group.vote.changed', { group_id: req.params.id, user_id, place_id, voted: false });
      return res.json({ voted: false, vote: null });
    }
    const result = await pool.query('INSERT INTO groups.group_votes (group_id, user_id, place_id) VALUES ($1, $2, $3) RETURNING *', [req.params.id, user_id, place_id]);

    await invalidateGroup(req.params.id);
    events.publish('group.vote.changed', { group_id: req.params.id, user_id, place_id, voted: true });

    res.json({ voted: true, vote: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to toggle vote' }); }
});

app.delete('/groups/:id', async (req, res) => {
  try {
    const result = await pool.query('UPDATE groups.groups SET is_active = false WHERE id = $1 AND created_by_user_id = $2 RETURNING id', [req.params.id, req.body.user_id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Group not found or not owned by user' });

    await invalidateGroup(req.params.id);
    events.publish('group.archived', { group_id: req.params.id, user_id: req.body.user_id });

    res.json({ message: 'Group archived' });
  } catch (error) { res.status(500).json({ error: 'Failed to archive group' }); }
});

app.listen(PORT, () => {
  console.log(`Group Service running on port ${PORT}`);
  cache.connect();
  events.connect();
});
