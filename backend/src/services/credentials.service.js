const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

// scrypt is built into Node (no native addon to compile in the Docker image)
// and memory-hard like Argon2. These are OWASP's recommended minimums:
// N=2^17, r=8, p=1 — about 128 MiB and a few hundred ms per hash. The
// parameters are stored inside each hash, so raising them later only affects
// passwords set from then on.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEM = 256 * 1024 * 1024;

function derive(password, salt, keyLength, { N, r, p }) {
  return scrypt(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: MAX_MEM });
}

// Format: scrypt$N$r$p$<salt b64>$<key b64>
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const [scheme, N, r, p, saltB64, keyB64] = (stored || '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await derive(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return crypto.timingSafeEqual(key, expected);
}

// Sign-in attempts for unknown emails still pay for one hash, so response
// time doesn't reveal which emails have accounts.
let dummyHash = null;
async function burnPasswordCheck(password) {
  dummyHash = dummyHash || hashPassword(crypto.randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHash);
}

// One-time links (invite / password reset): the raw token only ever goes
// into the link itself; the database stores its SHA-256.
function hashOneTimeToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newOneTimeToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashOneTimeToken(token) };
}

module.exports = { hashPassword, verifyPassword, burnPasswordCheck, newOneTimeToken, hashOneTimeToken };
