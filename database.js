const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bots.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    device_id TEXT PRIMARY KEY,
    hostname TEXT,
    os TEXT,
    arch TEXT,
    av TEXT,
    first_seen INTEGER,
    last_seen INTEGER,
    ip TEXT
  );
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    command TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER,
    delivered_at INTEGER,
    completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    command TEXT,
    output TEXT,
    created_at INTEGER
  );
`);

// Export the db object directly (better-sqlite3 is synchronous, so no promises needed)
module.exports = db;
