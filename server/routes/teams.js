const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { auth, role } = require('../middleware');

function notify(userId, type, title, message, data = {}) {
  db.prepare('INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), userId, type, title, message, JSON.stringify(data));
}

function computeMatchScore(userSkills, requiredSkills) {
  if (!requiredSkills.length) return 50;
  const matches = userSkills.filter(s => requiredSkills.includes(s)).length;
  return Math.round((matches / requiredSkills.length) * 100);
}

// ─── TEAM REQUESTS ───────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const { subject_id, type, group_id, status = 'open', search } = req.query;

  let query = `
    SELECT tr.*, 
      u.name as creator_name, u.avatar_color as creator_color,
      s.name as subject_name, s.code as subject_code,
      g.name as group_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.request_id = tr.id AND tm.status = 'accepted') + 1 as current_members
    FROM team_requests tr
    JOIN users u ON tr.creator_id = u.id
    JOIN subjects s ON tr.subject_id = s.id
    JOIN groups g ON tr.group_id = g.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND tr.status = ?'; params.push(status); }
  if (subject_id) { query += ' AND tr.subject_id = ?'; params.push(subject_id); }
  if (type) { query += ' AND tr.type = ?'; params.push(type); }
  if (group_id) { query += ' AND tr.group_id = ?'; params.push(group_id); }
  if (search) { query += ' AND (tr.title LIKE ? OR tr.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  // Students only see their group's requests
  if (req.user.role === 'student') {
    const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(req.user.id);
    if (user?.group_id) { query += ' AND tr.group_id = ?'; params.push(user.group_id); }
  }

  query += ' ORDER BY tr.created_at DESC';
  const requests = db.prepare(query).all(...params);
  res.json(requests.map(r => ({ ...r, required_skills: JSON.parse(r.required_skills || '[]') })));
});

router.get('/recommendations', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.group_id) return res.json([]);

  const userSkills = JSON.parse(user.skills || '[]');

  // Get open requests in user's group where user isn't already a member
  const requests = db.prepare(`
    SELECT tr.*, 
      u.name as creator_name, u.avatar_color as creator_color,
      s.name as subject_name, s.code as subject_code,
      g.name as group_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.request_id = tr.id AND tm.status = 'accepted') + 1 as current_members
    FROM team_requests tr
    JOIN users u ON tr.creator_id = u.id
    JOIN subjects s ON tr.subject_id = s.id
    JOIN groups g ON tr.group_id = g.id
    WHERE tr.status = 'open'
      AND tr.group_id = ?
      AND tr.creator_id != ?
      AND tr.id NOT IN (
        SELECT request_id FROM team_members WHERE user_id = ?
      )
    ORDER BY tr.created_at DESC
    LIMIT 20
  `).all(user.group_id, user.id, user.id);

  // Score each request
  const scored = requests.map(r => {
    const required = JSON.parse(r.required_skills || '[]');
    const score = computeMatchScore(userSkills, required);
    const spotsLeft = r.max_members - r.current_members;
    const urgencyBonus = r.deadline ? Math.max(0, 10 - Math.floor((new Date(r.deadline) - Date.now()) / 86400000)) : 0;
    return { ...r, required_skills: required, match_score: score, spots_left: spotsLeft, final_score: score + urgencyBonus };
  });

  scored.sort((a, b) => b.final_score - a.final_score);
  res.json(scored.slice(0, 6));
});

router.get('/:id', auth, (req, res) => {
  const request = db.prepare(`
    SELECT tr.*, u.name as creator_name, u.avatar_color as creator_color, u.bio as creator_bio,
      s.name as subject_name, s.code as subject_code, g.name as group_name
    FROM team_requests tr
    JOIN users u ON tr.creator_id = u.id
    JOIN subjects s ON tr.subject_id = s.id
    JOIN groups g ON tr.group_id = g.id
    WHERE tr.id = ?
  `).get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });

  const members = db.prepare(`
    SELECT tm.*, u.name, u.email, u.skills, u.bio, u.avatar_color
    FROM team_members tm JOIN users u ON tm.user_id = u.id
    WHERE tm.request_id = ?
  `).all(req.params.id);

  res.json({
    ...request,
    required_skills: JSON.parse(request.required_skills || '[]'),
    members: members.map(m => ({ ...m, skills: JSON.parse(m.skills || '[]') }))
  });
});

router.post('/', auth, role('student'), (req, res) => {
  const { subject_id, title, description, type, max_members = 4, required_skills = [], deadline } = req.body;
  if (!subject_id || !title) return res.status(400).json({ error: 'Subject and title required' });

  const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(req.user.id);
  if (!user?.group_id) return res.status(400).json({ error: 'You must be in a group' });

  const subject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(subject_id);
  if (!subject) return res.status(400).json({ error: 'Subject not found' });

  const id = uuidv4();
  db.prepare(`INSERT INTO team_requests (id, creator_id, subject_id, title, description, type, max_members, required_skills, group_id, deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.user.id, subject_id, title, description || '', type || 'project', max_members, JSON.stringify(required_skills), user.group_id, deadline || null);

  res.json(db.prepare('SELECT * FROM team_requests WHERE id = ?').get(id));
});

router.put('/:id', auth, (req, res) => {
  const request = db.prepare('SELECT * FROM team_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.creator_id !== req.user.id && req.user.role === 'student')
    return res.status(403).json({ error: 'Forbidden' });

  const { title, description, type, max_members, required_skills, status, deadline } = req.body;
  db.prepare(`UPDATE team_requests SET 
    title = COALESCE(?, title), description = COALESCE(?, description),
    type = COALESCE(?, type), max_members = COALESCE(?, max_members),
    required_skills = COALESCE(?, required_skills), status = COALESCE(?, status),
    deadline = COALESCE(?, deadline)
    WHERE id = ?`).run(title, description, type, max_members,
    required_skills ? JSON.stringify(required_skills) : null, status, deadline, req.params.id);

  res.json(db.prepare('SELECT * FROM team_requests WHERE id = ?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  const request = db.prepare('SELECT * FROM team_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.creator_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM team_members WHERE request_id = ?').run(req.params.id);
  db.prepare('DELETE FROM team_requests WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── MEMBERSHIP ───────────────────────────────────────────────────
router.post('/:id/join', auth, role('student'), (req, res) => {
  const request = db.prepare('SELECT * FROM team_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.status !== 'open') return res.status(400).json({ error: 'Team is not open' });
  if (request.creator_id === req.user.id) return res.status(400).json({ error: 'Cannot join your own team' });

  const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(req.user.id);
  if (user.group_id !== request.group_id)
    return res.status(403).json({ error: 'You must be from the same group' });

  const existing = db.prepare('SELECT id FROM team_members WHERE request_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already applied' });

  const acceptedCount = db.prepare("SELECT COUNT(*) as c FROM team_members WHERE request_id = ? AND status = 'accepted'").get(req.params.id).c;
  if (acceptedCount + 1 >= request.max_members) return res.status(400).json({ error: 'Team is full' });

  const id = uuidv4();
  db.prepare('INSERT INTO team_members (id, request_id, user_id, status) VALUES (?, ?, ?, ?)').run(id, req.params.id, req.user.id, 'pending');

  notify(request.creator_id, 'join_request', '📩 New join request', `${req.user.name} wants to join your team "${request.title}"`, { request_id: req.params.id, user_id: req.user.id });

  res.json({ ok: true, message: 'Join request sent' });
});

router.post('/:id/members/:userId/accept', auth, (req, res) => {
  const request = db.prepare('SELECT * FROM team_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.creator_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });

  const acceptedCount = db.prepare("SELECT COUNT(*) as c FROM team_members WHERE request_id = ? AND status = 'accepted'").get(req.params.id).c;
  if (acceptedCount + 1 >= request.max_members)
    return res.status(400).json({ error: 'Team is full' });

  db.prepare("UPDATE team_members SET status = 'accepted' WHERE request_id = ? AND user_id = ?").run(req.params.id, req.params.userId);

  const newCount = db.prepare("SELECT COUNT(*) as c FROM team_members WHERE request_id = ? AND status = 'accepted'").get(req.params.id).c;
  if (newCount + 1 >= request.max_members) {
    db.prepare("UPDATE team_requests SET status = 'full' WHERE id = ?").run(req.params.id);
  }

  notify(req.params.userId, 'accepted', '🎉 Request accepted!', `You have been accepted into team "${request.title}"`, { request_id: req.params.id });
  res.json({ ok: true });
});

router.post('/:id/members/:userId/reject', auth, (req, res) => {
  const request = db.prepare('SELECT * FROM team_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (request.creator_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });

  db.prepare("UPDATE team_members SET status = 'rejected' WHERE request_id = ? AND user_id = ?").run(req.params.id, req.params.userId);
  notify(req.params.userId, 'rejected', '❌ Request declined', `Your request to join "${request.title}" was declined`, { request_id: req.params.id });
  res.json({ ok: true });
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────
router.get('/notifications/mine', auth, (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user.id);
  res.json(notifs.map(n => ({ ...n, data: JSON.parse(n.data || '{}') })));
});

router.post('/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ─── USER PROFILE ───────────────────────────────────────────────────
router.get('/users/me/teams', auth, (req, res) => {
  const created = db.prepare(`
    SELECT tr.*, s.name as subject_name, s.code as subject_code, g.name as group_name,
    (SELECT COUNT(*) FROM team_members tm WHERE tm.request_id = tr.id AND tm.status = 'accepted') + 1 as current_members
    FROM team_requests tr JOIN subjects s ON tr.subject_id = s.id JOIN groups g ON tr.group_id = g.id
    WHERE tr.creator_id = ?
  `).all(req.user.id);

  const joined = db.prepare(`
    SELECT tr.*, s.name as subject_name, s.code as subject_code, g.name as group_name, tm.status as member_status,
    (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.request_id = tr.id AND tm2.status = 'accepted') + 1 as current_members
    FROM team_members tm
    JOIN team_requests tr ON tm.request_id = tr.id
    JOIN subjects s ON tr.subject_id = s.id
    JOIN groups g ON tr.group_id = g.id
    WHERE tm.user_id = ?
  `).all(req.user.id);

  res.json({ created, joined });
});

router.put('/users/me/profile', auth, (req, res) => {
  const { name, bio, skills } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), skills = COALESCE(?, skills) WHERE id = ?')
    .run(name, bio, skills ? JSON.stringify(skills) : null, req.user.id);
  const user = db.prepare('SELECT id, email, name, role, group_id, skills, bio, avatar_color FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...user, skills: JSON.parse(user.skills || '[]') });
});

// ─── ADMIN ───────────────────────────────────────────────────
router.get('/admin/users', auth, role('admin'), (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, group_id, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.put('/admin/users/:id/role', auth, role('admin'), (req, res) => {
  const { role: newRole } = req.body;
  if (!['student', 'teacher', 'admin'].includes(newRole)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/users/:id', auth, role('admin'), (req, res) => {
  db.prepare('DELETE FROM team_members WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
