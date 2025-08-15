const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt'); // ADDED for password security
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// CHANGED: Use modern express methods instead of body-parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Serve files from the 'public' directory

app.use(session({
  secret: process.env.SESSION_SECRET || 'a-much-stronger-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Recommended for production
}));


// --- Routes ---

// ADDED: Homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// User registration
app.post('/register', (req, res) => {
  const { name, email, phone, event, date, time } = req.body;
  // FIXED: Explicitly map request body to the correct database columns
  const query = 'INSERT INTO users (name, email, phone, event_name, event_date, event_time) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [name, email, phone, event, date, time], (err) => {
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
  const query = 'SELECT * FROM admin WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) {
      // CHANGED: Generic error message to prevent user enumeration
      return res.status(401).send('Invalid username or password');
    }

    const admin = results[0];
    
    // CHANGED: Securely compare hashed password
    bcrypt.compare(password, admin.password, (err, isMatch) => {
      if (isMatch) {
        req.session.admin = admin.username;
        res.redirect('/dashboard.html');
      } else {
        res.status(401).send('Invalid username or password');
      }
    });
  });
});

// Middleware to protect admin routes
const isAdmin = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }
  res.status(403).json({ message: 'Unauthorized' });
};

// Admin routes (now protected)
app.get('/admin/users', isAdmin, (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).send('Error fetching users');
    res.json(results);
  });
});

app.post('/admin/delete-user', isAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  db.query('DELETE FROM users WHERE name = ?', [name], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error deleting user' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  });
});

app.get('/admin/events', isAdmin, (req, res) => {
  db.query('SELECT * FROM events', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching events' });
    res.json(results);
  });
});

app.post('/admin/add-event', isAdmin, (req, res) => {
  const { name, date, time, description } = req.body;
  if (!name || !date || !time || !description) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // FIXED: Query uses correct column names
  const query = 'INSERT INTO events (event_name, event_date, event_time, description) VALUES (?, ?, ?, ?)';
  db.query(query, [name.trim(), date, time, description.trim()], (err) => {
    if (err) {
      console.error('Error adding event:', err);
      return res.status(500).json({ message: 'Failed to add event' });
    }
    res.json({ message: 'Event added successfully' });
  });
});

app.post('/admin/delete-event', isAdmin, (req, res) => {
  const { name } = req.body;
  // FIXED: Query uses correct column names
  db.query('DELETE FROM events WHERE event_name = ?', [name], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to delete event' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  });
});

// Public route to get events
app.get('/events', (req, res) => {
  // This query was already correct from our last discussion
  const query = `
    SELECT 
      event_name AS name, 
      DATE_FORMAT(event_date, "%Y-%m-%d") AS date, 
      TIME_FORMAT(event_time, "%H:%i") AS time, 
      description AS location 
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


// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});