# JavaScript Guestbook Application

A simple guestbook web application built with Node.js, Express, and Redis.

## Features

- **Real-time guestbook entries**: Users can add messages that appear immediately
- **Redis integration**: Uses Redis for persistent storage with fallback to in-memory storage
- **Master-slave Redis support**: Reads from slave, writes to master for better performance
- **Kubernetes ready**: Includes deployment configurations for container orchestration
- **Health checks**: Built-in health check endpoints for monitoring
- **Security**: Implements security best practices with Helmet.js
- **Responsive design**: Clean, modern UI that works on all devices

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Redis (optional - will use in-memory storage if not available)
- Docker (for containerization)
- Kubernetes (for deployment)

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd guestbook-js
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Redis (optional):
   ```bash
   # Using Docker
   docker run -d --name redis -p 6379:6379 redis:alpine
   
   # Or using local Redis installation
   redis-server
   ```

4. Start the application:
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

### Environment Variables

The application supports the following environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `REDIS_MASTER_SERVICE_HOST`: Redis master host
- `REDIS_MASTER_SERVICE_PORT`: Redis master port
- `REDIS_MASTER_SERVICE_PASSWORD`: Redis password
- `REDIS_MASTER_PORT`: Alternative Redis master port configuration

## Docker Deployment

### Build the Docker image:

```bash
docker build -t guestbook-js:v1 .
```

### Run the container:

```bash
# Without Redis
docker run -p 3000:3000 guestbook-js:v1

# With Redis
docker run -d --name redis redis:alpine
docker run -p 3000:3000 --link redis:redis-master guestbook-js:v1
```

## Kubernetes Deployment

1. Build and push the Docker image to your registry:
   ```bash
   docker build -t your-registry/guestbook-js:v1 .
   docker push your-registry/guestbook-js:v1
   ```

2. Update the image name in `deployment.yml`:
   ```yaml
   image: your-registry/guestbook-js:v1
   ```

3. Deploy to Kubernetes:
   ```bash
   kubectl apply -f deployment.yml
   ```

4. Get the service URL:
   ```bash
   kubectl get services guestbook-js-service
   ```

## API Endpoints

- `GET /` - Main guestbook page
- `GET /lrange/:key` - Get all entries for a key
- `GET /rpush/:key/:value` - Add a new entry
- `GET /info` - Database information
- `GET /env` - Environment variables
- `GET /hello` - Health check endpoint

## Architecture

The application follows a simple architecture:

1. **Frontend**: Static HTML/CSS/JavaScript served by Express
2. **Backend**: Node.js with Express framework
3. **Storage**: Redis with in-memory fallback
4. **Container**: Multi-stage Docker build for optimization
5. **Orchestration**: Kubernetes deployment with service

## Key Differences from Go Version

1. **Framework**: Uses Express.js instead of Gorilla Mux
2. **Redis Client**: Uses the official Redis Node.js client
3. **Error Handling**: JavaScript async/await pattern instead of Go's error handling
4. **Middleware**: Uses Express middleware ecosystem (Helmet, CORS)
5. **Build Process**: Uses npm/Docker instead of Go build tools

## Development

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-restart
- `npm test` - Run tests (placeholder)

### Code Structure

- `server.js` - Main application file with all routes and logic
- `public/` - Static assets (HTML, CSS, JavaScript)
- `package.json` - Node.js project configuration
- `Dockerfile` - Container build instructions
- `deployment.yml` - Kubernetes deployment configuration

## Monitoring and Health Checks

The application includes several monitoring endpoints:

- `/hello` - Basic health check
- `/info` - Database status information
- `/env` - Environment configuration (be careful in production)

The Kubernetes deployment includes:
- Liveness probe on `/hello`
- Readiness probe on `/hello`
- Resource limits and requests

## Security Features

- Helmet.js for security headers
- CORS support for cross-origin requests
- Input validation and sanitization
- Non-root user in Docker container
- Security-focused Docker image

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the original Kubernetes guestbook for details.

## Troubleshooting

### Common Issues

1. **Redis connection issues**: Check Redis connectivity and credentials
2. **Port conflicts**: Ensure port 3000 is available or set a different PORT
3. **Docker build failures**: Check Docker version and available disk space
4. **Kubernetes deployment issues**: Verify cluster connectivity and image registry access

### Logs

View application logs:
```bash
# Docker
docker logs <container-id>

# Kubernetes
kubectl logs deployment/guestbook-js
```