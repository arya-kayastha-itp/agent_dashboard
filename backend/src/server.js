const app = require('./app');
const env = require('./config/env');
const { startEscalationChecks } = require('./services/escalations.service');

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});

// Background jobs start here, not in app.js, so scripts and tests that load
// the app don't start timers. ESCALATION_CHECKS=off turns them off.
if (process.env.ESCALATION_CHECKS !== 'off') {
  startEscalationChecks();
}
