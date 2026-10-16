// Fixed-window, in-memory request limit per client IP, for the endpoints
// anyone can reach without signing in. In memory is enough while the app
// runs as a single replica (it does — see README "Deployment"); with more,
// each replica would count separately.
//
// RATE_LIMITS=off turns every limiter off — the integration tests sign in
// far more often than any person would, all from one IP.
function rateLimit({ windowMs, max, message = 'Too many requests — please wait a moment and try again.' }) {
  const hits = new Map();

  // Forget finished windows now and then so the map can't grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    if (process.env.RATE_LIMITS === 'off') return next();

    const now = Date.now();
    let entry = hits.get(req.ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, entry);
    }
    entry.count += 1;
    if (entry.count <= max) return next();

    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: { message, code: 'RATE_LIMITED' } });
  };
}

const MINUTE = 60 * 1000;

// Per IP. Sign-in also has per-account lockout (5 wrong passwords → 15
// minutes); this stops one client spraying many accounts.
const limits = {
  signIn: () => rateLimit({ windowMs: 15 * MINUTE, max: 20, message: 'Too many sign-in attempts from here — try again in a few minutes.' }),
  forgotPassword: () => rateLimit({ windowMs: 15 * MINUTE, max: 5, message: 'Too many reset requests — try again in a few minutes.' }),
  passwordLinks: () => rateLimit({ windowMs: 15 * MINUTE, max: 30 }),
  // Agents report usage without signing in until 2b adds per-agent API keys.
  usageIngest: () => rateLimit({ windowMs: MINUTE, max: 600 }),
  usageIngestBatch: () => rateLimit({ windowMs: MINUTE, max: 60 }),
};

module.exports = { rateLimit, limits };
