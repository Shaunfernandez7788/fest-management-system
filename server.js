const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'a-much-stronger-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Register user
app.post('/register', (req, res) => {
  const { name, email, phone, event } = req.body;

  const query = `
    INSERT INTO users (name, email, phone, event, timestamp)
    VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(query, [name, email, phone, event], (err) => {
    if (err) {
      console.error('Error registering user:', err);
      return res.status(500).send('Error registering user');
    }
    res.redirect('/thankyou.html');
  });
});

// Admin login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM admin WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send('Invalid username or password');
    }

    const admin = results[0];

    if (password === admin.password) {
      req.session.admin = admin.username;
      return res.redirect('/dashboard.html');
    }

    res.status(401).send('Invalid username or password');
  });
});

// Admin session middleware
const isAdmin = (req, res, next) => {
  if (req.session.admin) return next();
  res.status(403).json({ message: 'Unauthorized' });
};

// Fetch users
app.get('/admin/users', isAdmin, (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).send('Error fetching users');
    res.json(results);
  });
});

// Delete user
app.post('/admin/delete-user', isAdmin, (req, res) => {
  const { name } = req.body;

  db.query('DELETE FROM users WHERE name = ?', [name], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error deleting user' });

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  });
});

// Fetch events
app.get('/admin/events', isAdmin, (req, res) => {
  db.query('SELECT * FROM events', (err, results) => {
    if (err) return res.status(500).send('Error fetching events');
    res.json(results);
  });
});

// Add event
app.post('/admin/add-event', isAdmin, (req, res) => {
  const { name, date, time, location } = req.body;

  const query = `
    INSERT INTO events (name, date, time, location)
    VALUES (?, ?, ?)
  `;

  db.query(query, [name, date, time, location], (err) => {
    if (err) {
      console.error('Error adding event:', err);
      return res.status(500).json({ message: 'Failed to add event' });
    }
    res.json({ message: 'Event added successfully' });
  });
});

// Delete event
app.post('/admin/delete-event', isAdmin, (req, res) => {
  const { name } = req.body;

  db.query('DELETE FROM events WHERE name = ?', [name], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to delete event' });

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Event not found' });

    res.json({ message: 'Event deleted successfully' });
  });
});

// Public fetch events
app.get('/events', (req, res) => {
  db.query('SELECT * FROM events', (err, results) => {
    if (err) {
      console.error("Error fetching events:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    res.json(results);
  });
});

// --- CHANGES FOR VERCEL ---
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;