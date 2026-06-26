const express = require('express');
const router = express.Router();
const db = require('../database');

// Helper for error handling
const asyncWrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/devices
router.get('/devices', asyncWrap(async (req, res) => {
    const devices = await db.all(
        'SELECT * FROM devices ORDER BY last_seen DESC'
    );
    res.json(devices);
}));

// GET /api/device/:id
router.get('/device/:id', asyncWrap(async (req, res) => {
    const device = await db.get(
        'SELECT * FROM devices WHERE device_id = ?',
        [req.params.id]
    );
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
}));

// GET /api/device/:id/results
router.get('/device/:id/results', asyncWrap(async (req, res) => {
    const results = await db.all(
        'SELECT * FROM results WHERE device_id = ? ORDER BY created_at DESC LIMIT 100',
        [req.params.id]
    );
    res.json(results);
}));

// GET /api/device/:id/queue
router.get('/device/:id/queue', asyncWrap(async (req, res) => {
    const queue = await db.all(
        'SELECT * FROM commands WHERE device_id = ? ORDER BY created_at DESC',
        [req.params.id]
    );
    res.json(queue);
}));

// POST /api/device/:id/command
router.post('/device/:id/command', asyncWrap(async (req, res) => {
    const { command } = req.body;
    if (!command || command.trim() === '') {
        return res.status(400).json({ error: 'Command cannot be empty' });
    }

    const now = Date.now();
    await db.run(
        `INSERT INTO commands (device_id, command, status, created_at) VALUES (?, ?, 'pending', ?)`,
        [req.params.id, command.trim(), now]
    );

    res.json({ success: true, message: 'Command queued' });
}));

// DELETE /api/device/:id/queue
router.delete('/device/:id/queue', asyncWrap(async (req, res) => {
    await db.run(
        `DELETE FROM commands WHERE device_id = ? AND status = 'pending'`,
        [req.params.id]
    );
    res.json({ success: true, message: 'Pending commands cleared' });
}));

module.exports = router;
