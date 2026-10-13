// Server-side mirror of frontend/src/constants.js's PERSONAS. Who holds which
// persona is no longer hardcoded here — it's each account's `role` in the
// users table (see services/users.service.js).
const PERSONAS = {
  EXECUTIVE: 'EXECUTIVE',
  AGENT_MANAGER: 'AGENT_MANAGER',
  FINOPS: 'FINOPS',
  CONTRIBUTOR: 'CONTRIBUTOR',
};

module.exports = { PERSONAS, PERSONA_VALUES: Object.values(PERSONAS) };
