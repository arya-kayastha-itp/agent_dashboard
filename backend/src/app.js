const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const agentsRoutes = require('./routes/agents.routes');
const updatesRoutes = require('./routes/updates.routes');
const finopsRoutes = require('./routes/finops.routes');
const insightsRoutes = require('./routes/insights.routes');
const teamMembersRoutes = require('./routes/team-members.routes');
const usersRoutes = require('./routes/users.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/finops', finopsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/team-members', teamMembersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/submissions', submissionsRoutes);

// In the deployed container the built SPA sits at frontend/dist and is served
// from this same origin, so the frontend's relative `/api` base URL just works.
// In local dev Vite serves the frontend on its own port, so this is skipped
// unless a build happens to exist (and is harmless if it does).
const staticDir = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  // Client-side routes (BrowserRouter) fall back to index.html; unknown /api
  // paths still fall through to the JSON 404 below.
  app.get(/^(?!\/api(\/|$)).*/, (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
