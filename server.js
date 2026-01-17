const express = require('express');
const redis = require('redis');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (this covers style.css, script.js, and jquery)
app.use(express.static(path.join(__dirname, 'public')));

let memoryStore = new Map();
let redisClient = null;

async function initRedis() {
  const host = process.env.REDIS_MASTER_SERVICE_HOST;
  const port = process.env.REDIS_MASTER_SERVICE_PORT || 6379;
  if (host) {
    redisClient = redis.createClient({ url: `redis://${host}:${port}` });
    await redisClient.connect().catch(err => console.log("Redis not ready yet"));
  }
}

// API Routes for Guestbook
app.get('/lrange/:key', async (req, res) => {
  const key = req.params.key;
  if (redisClient) {
    const data = await redisClient.lRange(key, 0, -1);
    return res.json(data || []);
  }
  res.json(memoryStore.get(key) || []);
});

app.get('/rpush/:key/:value', async (req, res) => {
  const { key, value } = req.params;
  if (redisClient) {
    await redisClient.rPush(key, value);
    const data = await redisClient.lRange(key, 0, -1);
    return res.json(data);
  }
  const list = memoryStore.get(key) || [];
  list.push(value);
  memoryStore.set(key, list);
  res.json(list);
});

// Information Routes (Matches your index.html links)
app.get('/hello', (req, res) => {
  res.send(`Hello! Hostname: ${require('os').hostname()}\n`);
});

app.get('/env', (req, res) => {
  res.json(process.env);
});

app.get('/info', (req, res) => {
  res.json({
    podName: require('os').hostname(),
    platform: process.platform,
    nodeVersion: process.version
  });
});

// Serve the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and Listen
initRedis().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
