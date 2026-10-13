require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Public base URL of the frontend — invite and password-reset links point here.
  appUrl: (process.env.APP_URL || 'http://localhost:5174').replace(/\/+$/, ''),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  auth: {
    jwtSecret: process.env.JWT_SECRET,
  },
  // Azure Communication Services Email. Both optional — without them, invite
  // and reset emails are logged instead of sent, and the Teams page's
  // copy-link flow is the only way to hand out links.
  email: {
    acsConnectionString: process.env.ACS_CONNECTION_STRING,
    sender: process.env.EMAIL_SENDER,
  },
  databricks: {
    host: process.env.DATABRICKS_HOST,
    token: process.env.DATABRICKS_TOKEN,
    httpPath: process.env.DATABRICKS_HTTP_PATH,
    catalog: process.env.DATABRICKS_CATALOG,
    schema: process.env.DATABRICKS_SCHEMA,
  },
};
