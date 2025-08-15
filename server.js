const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db'); // Ensure db.js uses process.env vars

const app = express();
const PORT = process.env.PORT || 3000; // ✅ Allow Render to set port

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'festSecretKey', // ✅ Use env var if available
  resave: false,
  saveUninitialized: true
}));

// Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/register', (req, res) => {
  const { name, email, phone, event, date, time } = req.body;
  const query = 'INSERT INTO users (name, email, phone, event, event_date, event_time) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [name, email, phone, event, date, time], (err) => {
    if (err) {
      console.error('Error registering user:', err);
      return res.status(500).send('Error registering user');
    }
    res.redirect('/thankyou.html');
  });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM admin WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).send('Error logging in');
    if (results.length === 0) return res.send('Invalid username');

    const admin = results[0];
    if (password === admin.password) {
      req.session.admin = admin.username;
      res.redirect('/dashboard.html');
    } else {
      res.send('Invalid password');
    }
  });
});

app.get('/admin/users', (req, res) => {
  if (!req.session.admin) return res.status(403).send('Unauthorized');
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).send('Error fetching users');
    res.json(results);
  });
});

app.post('/admin/delete-user', (req, res) => {
  if (!req.session.admin) return res.status(403).json({ message: 'Unauthorized' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  db.query('DELETE FROM users WHERE name = ?', [name], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error deleting user' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

app.get('/admin/events', (req, res) => {
  if (!req.session.admin) return res.status(403).json({ message: 'Unauthorized' });
  db.query('SELECT * FROM events', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching events' });
    res.json(results);
  });
});

app.post('/admin/add-event', (req, res) => {
  const { name, date, time, location } = req.body;
  if (!name || !date || !time || !location) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const query = 'INSERT INTO events (name, date, time, location) VALUES (?, ?, ?, ?)';
  db.query(query, [name.trim(), date, time, location.trim()], (err) => {
    if (err) {
      console.error('Error adding event:', err);
      return res.status(500).json({ message: 'Failed to add event' });
    }
    res.json({ message: 'Event added successfully' });
  });
});

app.post('/admin/delete-event', (req, res) => {
  if (!req.session.admin) return res.status(403).json({ message: 'Unauthorized' });

  const { name } = req.body;
  db.query('DELETE FROM events WHERE name = ?', [name], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to delete event' });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  });
});

app.get('/events', (req, res) => {
  const query = `
    SELECT 
      name, 
      DATE_FORMAT(date, "%Y-%m-%d") AS date, 
      TIME_FORMAT(time, "%H:%i") AS time, 
      location 
    FROM events
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching events:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    res.json(results);
  });
});

// ✅ Start server for Render
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
