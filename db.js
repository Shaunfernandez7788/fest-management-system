const mysql = require('mysql2');
require('dotenv').config();

// Using createPool instead of createConnection for better stability on Vercel
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: true // Usually required by cloud providers like Aiven/TiDB
    }
});

// Test the connection pool
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL database via Pool!');
        connection.release(); // Always release the connection back to the pool
    }
});

module.exports = pool;