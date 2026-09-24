const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: { message: 'Sign in required', code: 'UNAUTHENTICATED' } });
  }

  try {
    req.user = jwt.verify(token, env.auth.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: { message: 'Session expired — please sign in again', code: 'UNAUTHENTICATED' } });
  }
}

// Route-level authorization mirroring the frontend's per-persona page access
// (frontend/src/persona/navConfig.js, permissions.js) — the login screen is
// meaningless as a security boundary if the API underneath it doesn't also
// check who's asking.
function requirePersona(...personas) {
  return (req, res, next) => {
    if (!personas.includes(req.user?.persona)) {
      return res.status(403).json({ error: { message: 'Not authorized for this action', code: 'FORBIDDEN' } });
    }
    return next();
  };
}

module.exports = { authenticate, requirePersona };
