const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'teamup.db');

let _sqlDb = null;

function save() {
  if (!_sqlDb) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_sqlDb.export()));
}

const db = {
  prepare(sql) {
    return {
      get(...params) {
        try {
          const stmt = _sqlDb.prepare(sql);
          stmt.bind(params.flat());
          const row = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return row;
        } catch(e) { throw new Error(`SQL get error: ${e.message} | ${sql}`); }
      },
      all(...params) {
        try {
          const stmt = _sqlDb.prepare(sql);
          stmt.bind(params.flat());
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        } catch(e) { throw new Error(`SQL all error: ${e.message} | ${sql}`); }
      },
      run(...params) {
        try {
          _sqlDb.run(sql, params.flat());
          save();
          return { changes: _sqlDb.getRowsModified() };
        } catch(e) { throw new Error(`SQL run error: ${e.message} | ${sql}`); }
      },
    };
  },
  exec(sql) {
    try { _sqlDb.run(sql); save(); }
    catch(e) { throw new Error(`SQL exec error: ${e.message}`); }
  },
  pragma() {},
};

const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', group_id TEXT, skills TEXT DEFAULT '[]', bio TEXT DEFAULT '', avatar_color TEXT DEFAULT '#6C63FF', created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', teacher_id TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL, teacher_id TEXT, description TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS team_requests (id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, subject_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '', type TEXT NOT NULL DEFAULT 'project', max_members INTEGER NOT NULL DEFAULT 4, status TEXT NOT NULL DEFAULT 'open', required_skills TEXT DEFAULT '[]', group_id TEXT NOT NULL, deadline TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', joined_at TEXT DEFAULT (datetime('now')), UNIQUE(request_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, data TEXT DEFAULT '{}', read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`
];

async function initDb() {
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });

  if (fs.existsSync(DB_PATH)) {
    _sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('📂 Loaded existing database');
  } else {
    _sqlDb = new SQL.Database();
    console.log('🆕 Created new database');
  }

  SCHEMA_STMTS.forEach(s => { try { _sqlDb.run(s); } catch(e) { console.warn('Schema warn:', e.message); } });
  save();

  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const id = uuidv4();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(id, 'admin@teamup.kz', hash, 'Administrator', 'admin');
    console.log('✅ Admin created: admin@teamup.kz / admin123');
  }

  console.log('✅ Database ready');
  return db;
}

module.exports = { db, initDb };
