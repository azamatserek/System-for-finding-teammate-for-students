const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { auth, role } = require('../middleware');

// ─── GROUPS ───────────────────────────────────────────────────
router.get('/groups', auth, (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, u.name as teacher_name,
    (SELECT COUNT(*) FROM users WHERE group_id = g.id) as member_count
    FROM groups g LEFT JOIN users u ON g.teacher_id = u.id
    ORDER BY g.name
  `).all();
  res.json(groups);
});

router.post('/groups', auth, role('admin', 'teacher'), (req, res) => {
  const { name, description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const exists = db.prepare('SELECT id FROM groups WHERE name = ?').get(name);
  if (exists) return res.status(409).json({ error: 'Group already exists' });
  const id = uuidv4();
  db.prepare('INSERT INTO groups (id, name, description, teacher_id) VALUES (?, ?, ?, ?)')
    .run(id, name, description, req.user.role === 'teacher' ? req.user.id : null);
  res.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(id));
});

router.put('/groups/:id', auth, role('admin', 'teacher'), (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE groups SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?')
    .run(name, description, req.params.id);
  res.json(db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id));
});

router.delete('/groups/:id', auth, role('admin'), (req, res) => {
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/groups/:id/members', auth, (req, res) => {
  const members = db.prepare('SELECT id, name, email, skills, bio, avatar_color FROM users WHERE group_id = ?').all(req.params.id);
  res.json(members.map(m => ({ ...m, skills: JSON.parse(m.skills || '[]') })));
});

// ─── SUBJECTS ───────────────────────────────────────────────────
router.get('/subjects', auth, (req, res) => {
  const subjects = db.prepare(`
    SELECT s.*, u.name as teacher_name
    FROM subjects s LEFT JOIN users u ON s.teacher_id = u.id
    ORDER BY s.name
  `).all();
  res.json(subjects);
});

router.post('/subjects', auth, role('admin', 'teacher'), (req, res) => {
  const { name, code, description = '' } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code required' });
  const id = uuidv4();
  db.prepare('INSERT INTO subjects (id, name, code, description, teacher_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, code, description, req.user.role === 'teacher' ? req.user.id : null);
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id));
});

router.put('/subjects/:id', auth, role('admin', 'teacher'), (req, res) => {
  const { name, code, description } = req.body;
  db.prepare('UPDATE subjects SET name = COALESCE(?, name), code = COALESCE(?, code), description = COALESCE(?, description) WHERE id = ?')
    .run(name, code, description, req.params.id);
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id));
});

router.delete('/subjects/:id', auth, role('admin'), (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
