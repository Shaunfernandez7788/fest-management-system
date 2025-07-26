// db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'festdb'
});

// Connect and handle errors
connection.connect((err) => {
  if (err) {
    console.error('❌ Failed to connect to MySQL:', err.message);
    process.exit(1); // Exit the app if DB connection fails
  }
  console.log(`✅ Connected to MySQL database "${process.env.DB_NAME}" as "${process.env.DB_USER}"`);
});

module.exports = connection;
