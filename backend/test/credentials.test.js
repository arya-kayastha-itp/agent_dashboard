const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hashPassword,
  verifyPassword,
  burnPasswordCheck,
  newOneTimeToken,
  hashOneTimeToken,
} = require('../src/services/credentials.service');

test('a hashed password verifies, and a wrong one does not', async () => {
  const stored = await hashPassword('correct horse battery');
  assert.match(stored, /^scrypt\$131072\$8\$1\$[^$]+\$[^$]+$/);
  assert.equal(await verifyPassword('correct horse battery', stored), true);
  assert.equal(await verifyPassword('correct horse batterY', stored), false);
});

test('the same password hashes differently each time (random salt)', async () => {
  const [a, b] = await Promise.all([hashPassword('same password here'), hashPassword('same password here')]);
  assert.notEqual(a, b);
});

test('missing or malformed stored hashes never verify', async () => {
  assert.equal(await verifyPassword('anything at all', null), false);
  assert.equal(await verifyPassword('anything at all', ''), false);
  assert.equal(await verifyPassword('anything at all', 'bcrypt$whatever'), false);
});

test('the dummy check for unknown emails resolves without throwing', async () => {
  await burnPasswordCheck('some guess');
});

test('one-time tokens are random and only their hash is derived from them', () => {
  const first = newOneTimeToken();
  const second = newOneTimeToken();
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashOneTimeToken(first.token));
  assert.match(first.tokenHash, /^[0-9a-f]{64}$/);
  assert.ok(!first.tokenHash.includes(first.token));
});
