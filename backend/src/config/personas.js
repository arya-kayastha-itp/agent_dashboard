// Server-side mirror of frontend/src/constants.js's PERSONAS. Who holds which
// persona is no longer hardcoded here — it's each account's `role` in the
// users table (see services/users.service.js).
const PERSONAS = {
  EXECUTIVE: 'EXECUTIVE',
  AGENT_MANAGER: 'AGENT_MANAGER',
  FINOPS: 'FINOPS',
  CONTRIBUTOR: 'CONTRIBUTOR',
};

// Being assigned to an agent is what makes someone a contributor on it, on
// top of their role. These roles send their updates to the Agent Manager for
// review. The Agent Manager updates directly (they're the reviewer), and
// Executives are view-only even when assigned.
const SUBMITTING_PERSONAS = [PERSONAS.CONTRIBUTOR, PERSONAS.FINOPS];

module.exports = { PERSONAS, PERSONA_VALUES: Object.values(PERSONAS), SUBMITTING_PERSONAS };
