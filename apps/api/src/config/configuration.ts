import { parseCorsOrigins } from './env.schema';

export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: Number(process.env.PORT),
    frontendUrl: process.env.FRONTEND_URL,
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS ?? ''),
    swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
    cookieSecret: process.env.COOKIE_SECRET,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  security: {
    throttleTtl: Number(process.env.THROTTLE_TTL),
    throttleLimit: Number(process.env.THROTTLE_LIMIT),
  },
  uploads: {
    dir: process.env.UPLOADS_DIR ?? './uploads',
  },
  routing: {
    osrmBaseUrl: process.env.OSRM_BASE_URL,
    osrmTimeoutMs: Number(process.env.OSRM_TIMEOUT_MS),
  },
});
