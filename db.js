const mysql = require('mysql2');
require('dotenv').config(); // For local development

// Use the single connection URL provided by Railway
const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect((err) => {
  if (err) {
    console.error('❌ Failed to connect to MySQL:', err);
    process.exit(1);
  }
  console.log('✅ Successfully connected to the database.');
});

module.exports = connection;