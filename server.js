const express = require('express');
const redis = require('redis');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://afeld.github.io"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS middleware
app.use(cors());

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for when Redis is not available
let memoryStore = new Map();

// Redis configuration
let redisClient = null;
let redisSlaveClient = null;

async function initRedis() {
  try {
    const redisUrl = findRedisURL();
    console.log('Redis URL:', redisUrl || 'Not found, using in-memory storage');
    
    if (redisUrl) {
      // Initialize master connection
      redisClient = redis.createClient({
        url: redisUrl
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis Master Error:', err);
        redisClient = null;
      });
      
      redisClient.on('connect', () => {
        console.log('Connected to Redis master');
      });
      
      await redisClient.connect();
      
      // Try to initialize slave connection
      try {
        redisSlaveClient = redis.createClient({
          url: 'redis://redis-slave:6379'
        });
        
        redisSlaveClient.on('error', (err) => {
          console.log('Redis Slave not available, using master for reads');
          redisSlaveClient = null;
        });
        
        await redisSlaveClient.connect();
        console.log('Connected to Redis slave');
      } catch (err) {
        console.log('Redis slave not available, using master for reads');
        redisSlaveClient = null;
      }
    }
  } catch (error) {
    console.log('Redis not available, using in-memory storage:', error.message);
    redisClient = null;
    redisSlaveClient = null;
  }
}

function findRedisURL() {
  const host = process.env.REDIS_MASTER_SERVICE_HOST;
  const port = process.env.REDIS_MASTER_SERVICE_PORT;
  const password = process.env.REDIS_MASTER_SERVICE_PASSWORD;
  const masterPort = process.env.REDIS_MASTER_PORT;

  if (host && port && password) {
    return `redis://:${password}@${host}:${port}`;
  } else if (masterPort) {
    return 'redis://redis-master:6379';
  }
  return null;
}

async function getList(key) {
  try {
    // Try slave first, then master, then memory
    const client = redisSlaveClient || redisClient;
    
    if (client) {
      const result = await client.lRange(key, 0, -1);
      return result || [];
    }
    
    // Fallback to in-memory storage
    return memoryStore.get(key) || [];
  } catch (error) {
    console.error('Error getting list:', error);
    return memoryStore.get(key) || [];
  }
}

async function appendToList(item, key) {
  try {
    if (redisClient) {
      await redisClient.rPush(key, item);
      const result = await redisClient.lRange(key, 0, -1);
      return result || [];
    }
    
    // Fallback to in-memory storage
    const currentList = memoryStore.get(key) || [];
    currentList.push(item);
    memoryStore.set(key, currentList);
    return currentList;
  } catch (error) {
    console.error('Error appending to list:', error);
    // Fallback to in-memory storage
    const currentList = memoryStore.get(key) || [];
    currentList.push(item);
    memoryStore.set(key, currentList);
    return currentList;
  }
}

// Routes
app.get('/lrange/:key', async (req, res) => {
  try {
    const items = await getList(req.params.key);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error getting list: ' + error.message });
  }
});

app.get('/rpush/:key/:value', async (req, res) => {
  try {
    const items = await appendToList(req.params.value, req.params.key);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error adding to list: ' + error.message });
  }
});

app.get('/info', async (req, res) => {
  try {
    if (redisClient) {
      const info = await redisClient.info();
      res.send(info);
    } else {
      res.send('In-memory datastore (not redis)\n');
    }
  } catch (error) {
    res.status(500).send('Error getting DB info: ' + error.message);
  }
});

app.get('/env', (req, res) => {
  const environment = {};
  for (const [key, value] of Object.entries(process.env)) {
    environment[key] = value;
  }
  res.json(environment);
});

app.get('/hello', (req, res) => {
  const hostname = process.env.HOSTNAME || 'unknown';
  res.send(`Hello from guestbook. Your app is up! (Hostname: ${hostname})\n`);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  if (redisSlaveClient) {
    await redisSlaveClient.quit();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  if (redisSlaveClient) {
    await redisSlaveClient.quit();
  }
  
  process.exit(0);
});

// Initialize Redis and start server
async function startServer() {
  await initRedis();
  
  app.listen(PORT, () => {
    console.log(`Guestbook server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the application`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});