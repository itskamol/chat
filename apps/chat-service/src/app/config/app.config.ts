import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Server Configuration
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/chat-db',
    name: process.env.DATABASE_NAME || 'chat-db',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT, 10) || 3001,
    corsOrigin: process.env.WS_CORS_ORIGIN || '*',
  },

  // gRPC Configuration
  grpc: {
    port: parseInt(process.env.GRPC_PORT, 10) || 5000,
    url: process.env.GRPC_URL || 'localhost:5000',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    helmetEnabled: process.env.HELMET_ENABLED === 'true',
  },

  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
    destination: process.env.UPLOAD_DEST || './uploads',
  },

  // Message Queue Configuration
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT, 10) || 6379,
      password: process.env.QUEUE_REDIS_PASSWORD || '',
    },
  },

  // Health Check Configuration
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    path: process.env.HEALTH_CHECK_PATH || '/health',
  },

  // Swagger Configuration
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || '/api/docs',
    title: process.env.SWAGGER_TITLE || 'Chat Service API',
    description: process.env.SWAGGER_DESCRIPTION || 'Real-time chat service API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },

  // External Services
  externalServices: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3003',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3004',
  },
}));
