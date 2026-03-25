import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'u975944253_mahmodnabelsi',
  password: process.env.DB_PASSWORD || '@flaT0nne14752',
  database: process.env.DB_NAME || 'u975944253_QSWOT'
};

let pool;
async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    // Ensure table exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS app_data (
        id VARCHAR(100) PRIMARY KEY,
        state JSON
      )
    `;
    await pool.query(createTableQuery);
    console.log("Connected to MySQL successfully.");
  } catch (err) {
    console.error("MySQL connection error:", err.message);
  }
}
initDB();

// API: Get State
app.get('/api/state', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const key = req.query.key || 'default';
    const [rows] = await pool.query('SELECT state FROM app_data WHERE id = ?', [key]);
    if (rows.length > 0) {
      res.json(rows[0].state);
    } else {
      res.json(null); // No data yet
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Health Check for Troubleshooting
app.get('/api/health', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ status: 'error', message: 'MySQL Pool is entirely uninitialized' });
    const [rows] = await pool.query('SELECT 1 as db_works');
    res.json({ status: 'connected', test_result: rows });
  } catch (err) {
    res.status(500).json({ status: 'disconnected', error: err.message });
  }
});

// API: Save State
app.post('/api/state', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ error: 'DB not connected' });
    const { key, state } = req.body;
    if (!key || state === undefined) return res.status(400).json({ error: 'Missing key or state' });
    
    // UPSERT pattern compatible with ALL MySQL/MariaDB versions
    const stateJson = JSON.stringify(state);
    const query = `
      INSERT INTO app_data (id, state) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE state = ?
    `;
    await pool.query(query, [key, stateJson, stateJson]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Database error' });
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback logic
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Node app is running on port ${port}`);
});
