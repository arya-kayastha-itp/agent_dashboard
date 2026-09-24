require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  auth: {
    password: process.env.AUTH_PASSWORD,
    jwtSecret: process.env.JWT_SECRET,
  },
  databricks: {
    host: process.env.DATABRICKS_HOST,
    token: process.env.DATABRICKS_TOKEN,
    httpPath: process.env.DATABRICKS_HTTP_PATH,
    catalog: process.env.DATABRICKS_CATALOG,
    schema: process.env.DATABRICKS_SCHEMA,
  },
};
