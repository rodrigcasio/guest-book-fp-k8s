const express = require('express');
const redis = require('redis');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * SECURITY MIDDLEWARE (HELMET)
 * Configured specifically for a local Minikube environment to allow 
 * local CSS/JS files and external CDNs (jQuery & Emoji CSS).
 */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://afeld.github.io"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:", "https:"],
      "upgrade-insecure-requests": null, // Allows HTTP access on Minikube IP
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * STATIC FILES
 * Serves index.html, style.css, and script.js from the /public folder
 */
app.use(express.static(path.join(__dirname, 'public')));

// In-memory fallback if Redis is unavailable
let memoryStore = new Map();
let redisClient = null;
let redisSlaveClient = null;

/**
 * REDIS INITIALIZATION
 */
async function initRedis() {
  try {
    const host = process.env.REDIS_MASTER_SERVICE_HOST;
    const port = process.env.REDIS_MASTER_SERVICE_PORT || 6379;

    if (host) {
      redisClient = redis.createClient({ url: `redis://${host}:${port}` });
      redisClient.on('error', (err) => console.error('Redis Master Error:', err));
      await redisClient.connect();
      console.log('Connected to Redis master');

      // Optional: Try connecting to slave
      try {
        redisSlaveClient = redis.createClient({ url: 'redis://redis-slave:6379' });
        await redisSlaveClient.connect();
        console.log('Connected to Redis slave');
      } catch (e) {
        console.log('Redis slave not detected, using master for reads');
      }
    } else {
      console.log('No Redis host env found, using in-memory storage');
    }
  } catch (error) {
    console.log('Redis connection failed, using in-memory storage');
  }
}

/**
 * API ROUTES
 */

// Get guestbook entries
app.get('/lrange/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const client = redisSlaveClient || redisClient;
    if (client) {
      const result = await client.lRange(key, 0, -1);
      return res.json(result || []);
    }
    res.json(memoryStore.get(key) || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add guestbook entry
app.get('/rpush/:key/:value', async (req, res) => {
  try {
    const { key, value } = req.params;
    if (redisClient) {
      await redisClient.rPush(key, value);
      const result = await redisClient.lRange(key, 0, -1);
      return res.json(result);
    }
    const current = memoryStore.get(key) || [];
    current.push(value);
    memoryStore.set(key, current);
    res.json(current);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/env', (req, res) => res.json(process.env));

app.get('/hello', (req, res) => {
  const hostname = require('os').hostname();
  res.send(`Hello from guestbook! Hostname: ${hostname}\n`);
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * START SERVER
 */
async function startServer() {
  await initRedis();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
