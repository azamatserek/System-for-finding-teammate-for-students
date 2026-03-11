const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

async function start() {
  await initDb();

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', require('./routes/groups'));
  app.use('/api/teams', require('./routes/teams'));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, () => console.log(`🚀 TeamUp running on http://localhost:${PORT}`));
}

start().catch(err => { console.error('Fatal startup error:', err); process.exit(1); });
