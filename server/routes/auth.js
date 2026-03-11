const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { JWT_SECRET } = require('../middleware');

const COLORS = ['#6C63FF','#FF6584','#43B89C','#F7A440','#E05C97','#3B82F6','#10B981','#F59E0B'];

router.post('/register', (req, res) => {
  const { email, password, name, role = 'student', group_id, skills = [], bio = '' } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  // Students must have a group
  if (role === 'student' && !group_id) return res.status(400).json({ error: 'Students must belong to a group' });

  if (group_id) {
    const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id);
    if (!group) return res.status(400).json({ error: 'Group not found' });
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  db.prepare(`INSERT INTO users (id, email, password_hash, name, role, group_id, skills, bio, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, email, hash, name, role === 'admin' ? 'student' : role, group_id || null, JSON.stringify(skills), bio, color);

  const user = db.prepare('SELECT id, email, name, role, group_id, skills, bio, avatar_color FROM users WHERE id = ?').get(id);
  const token = jwt.sign({ id, email, name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
  res.json({ user: { ...user, skills: JSON.parse(user.skills) }, token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });

  const { password_hash, ...safe } = user;
  res.json({ user: { ...safe, skills: JSON.parse(user.skills || '[]') }, token });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', require('../middleware').auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, group_id, skills, bio, avatar_color FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  let groupInfo = null;
  if (user.group_id) groupInfo = db.prepare('SELECT * FROM groups WHERE id = ?').get(user.group_id);
  res.json({ ...user, skills: JSON.parse(user.skills || '[]'), group: groupInfo });
});

module.exports = router;
