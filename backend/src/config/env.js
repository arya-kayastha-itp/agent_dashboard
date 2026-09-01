require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
