const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Initialize DB on startup
db.initDB();

// Middleware to authenticate
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

// Auth Routes
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: 'User registration failed (might already exist)' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Tracking Routes
app.get('/tracked', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT symbol FROM tracked_stocks WHERE user_id = $1 ORDER BY created_at ASC', [req.user.id]);
        res.json(result.rows.map(row => row.symbol));
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve tracked stocks' });
    }
});

app.post('/track', authenticate, async (req, res) => {
    try {
        const { symbol } = req.body;
        await db.query('INSERT INTO tracked_stocks (user_id, symbol) VALUES ($1, $2)', [req.user.id, symbol.toUpperCase()]);
        res.status(201).json({ message: 'Stock tracked successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to track stock (might already be tracked)' });
    }
});

app.delete('/track/:symbol', authenticate, async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        await db.query('DELETE FROM tracked_stocks WHERE user_id = $1 AND symbol = $2', [req.user.id, symbol]);
        res.json({ message: 'Stock untracked successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to untrack stock' });
    }
});

// Alerts Routes
app.get('/alerts', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
});

app.post('/alerts', authenticate, async (req, res) => {
    try {
        const { symbol, target_price, condition } = req.body; // condition: 'above' or 'below'
        const result = await db.query(
            'INSERT INTO alerts (user_id, symbol, target_price, condition) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, symbol.toUpperCase(), target_price, condition]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: 'Failed to create alert' });
    }
});

app.delete('/alerts/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ message: 'Alert deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// Update trigger manually or internally
app.patch('/alerts/:id/trigger', async (req, res) => {
    // This route is meant to be called internally by the alert-service
    try {
        const id = req.params.id;
        await db.query('UPDATE alerts SET is_triggered = TRUE WHERE id = $1', [id]);
        res.json({ message: 'Alert marked as triggered' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to trigger alert' });
    }
});

// Internal route for alerting service to get all pending alerts
app.get('/internal/alerts/pending', async (req, res) => {
    try {
        const result = await db.query('SELECT a.id, a.user_id, a.symbol, a.target_price, a.condition, u.username FROM alerts a JOIN users u ON a.user_id = u.id WHERE a.is_triggered = FALSE');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pending alerts' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`User Service is running on port ${PORT}`);
});
