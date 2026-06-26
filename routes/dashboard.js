const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/devices
router.get('/devices', (req, res) => {
  const devices = db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
  res.json(devices);
});

// GET /api/device/:id
router.get('/device/:id', (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

// GET /api/device/:id/results
router.get('/device/:id/results', (req, res) => {
  const results = db.prepare('SELECT * FROM results WHERE device_id = ? ORDER BY created_at DESC LIMIT 100').all(req.params.id);
  res.json(results);
});

// GET /api/device/:id/queue
router.get('/device/:id/queue', (req, res) => {
  const queue = db.prepare('SELECT * FROM commands WHERE device_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(queue);
});

// POST /api/device/:id/command
router.post('/device/:id/command', (req, res) => {
  const { command } = req.body;
  if (!command || command.trim() === '') {
    return res.status(400).json({ error: 'Command cannot be empty' });
  }
  const now = Date.now();
  db.prepare(`INSERT INTO commands (device_id, command, status, created_at) VALUES (?, ?, 'pending', ?)`).run(req.params.id, command.trim(), now);
  res.json({ success: true, message: 'Command queued' });
});

// DELETE /api/device/:id/queue
router.delete('/device/:id/queue', (req, res) => {
  db.prepare(`DELETE FROM commands WHERE device_id = ? AND status = 'pending'`).run(req.params.id);
  res.json({ success: true, message: 'Pending commands cleared' });
});

module.exports = router;
