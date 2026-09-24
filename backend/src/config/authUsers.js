const PERSONAS = {
  EXECUTIVE: 'EXECUTIVE',
  AGENT_MANAGER: 'AGENT_MANAGER',
  FINOPS: 'FINOPS',
};

// Server-side allowlist mirroring frontend/src/constants.js's PERSONAS.
// Every account shares one password (env AUTH_PASSWORD) — checked in
// auth.controller.js — so this map only decides which persona an email logs
// in as.
const PERSONA_BY_EMAIL = {
  'debrup.mondal@intuitive.ai': PERSONAS.EXECUTIVE,
  'arya.kayastha@intuitive.ai': PERSONAS.AGENT_MANAGER,
  'nancy.vaghela@intuitive.ai': PERSONAS.FINOPS,
};

function personaForEmail(email) {
  return PERSONA_BY_EMAIL[email.trim().toLowerCase()] ?? null;
}

module.exports = { PERSONAS, personaForEmail };
