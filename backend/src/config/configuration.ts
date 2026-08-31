export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/finagrow_db?schema=public',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'dev-finagrow-session-secret-key-32-chars-minimum-length',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    ttlDays: 30,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
});
