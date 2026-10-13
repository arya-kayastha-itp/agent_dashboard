const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usersService = require('../services/users.service');

const sessionExpired = { error: { message: 'Session expired — please sign in again', code: 'UNAUTHENTICATED' } };

// A valid signature isn't enough on its own: the account must still be active
// and the token's version must match the account's, so deactivating someone
// or resetting their password ends their existing sessions. The persona comes
// from the account, never from the token.
async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: { message: 'Sign in required', code: 'UNAUTHENTICATED' } });
  }

  let claims;
  try {
    claims = jwt.verify(token, env.auth.jwtSecret);
  } catch {
    return res.status(401).json(sessionExpired);
  }

  try {
    // Tokens from before per-person accounts carry no `sub` — they fail here
    // and the person signs in again.
    const account = claims.sub ? await usersService.getSessionUser(claims.sub) : null;
    if (!account || account.status !== 'active' || Number(account.tokenVersion) !== claims.tv) {
      return res.status(401).json(sessionExpired);
    }
    req.user = {
      id: account.id,
      teamMemberId: account.teamMemberId,
      name: account.name,
      email: account.email,
      persona: account.role,
    };
    return next();
  } catch (err) {
    return next(err);
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
