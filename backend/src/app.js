const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const agentsRoutes = require('./routes/agents.routes');
const updatesRoutes = require('./routes/updates.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/agents', agentsRoutes);
app.use('/api/updates', updatesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
