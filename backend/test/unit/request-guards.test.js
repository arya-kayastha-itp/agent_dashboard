// The guards in front of the signed-out endpoints, checked through the real
// app. Every request here is rejected before it reaches a service, so this
// needs no database and runs in CI without secrets.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

delete process.env.RATE_LIMITS;
const app = require('../../src/app');

let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

async function post(route, body, headers = {}) {
  const res = await fetch(base + route, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, data: await res.json() };
}

test('a body that is not JSON → 400 INVALID_JSON', async () => {
  const r = await post('/finops/usage-logs', '{"agentId": ');
  assert.equal(r.status, 400);
  assert.equal(r.data.error.code, 'INVALID_JSON');
});

test('a body over 256kb → 413 PAYLOAD_TOO_LARGE', async () => {
  const r = await post('/finops/usage-logs', { model: 'x'.repeat(300 * 1024) });
  assert.equal(r.status, 413);
  assert.equal(r.data.error.code, 'PAYLOAD_TOO_LARGE');
});

test('a usage batch over 500 entries is refused before anything is written', async () => {
  const r = await post('/finops/usage-logs/batch', { entries: Array.from({ length: 501 }, () => ({})) });
  assert.equal(r.status, 400);
  assert.equal(r.data.error.code, 'VALIDATION_ERROR');
});

test('sign-in: 20 tries per IP per 15 minutes, then 429', async () => {
  for (let i = 0; i < 20; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await post('/auth/login', {});
    assert.equal(r.status, 400, `attempt ${i + 1}`);
  }
  const r = await post('/auth/login', {});
  assert.equal(r.status, 429);
  assert.equal(r.data.error.code, 'RATE_LIMITED');
  assert.ok(Number(r.headers.get('retry-after')) > 800);
});

test('…counted per client IP from the proxy header, and per endpoint', async () => {
  // Behind Container Apps the ingress appends the real client IP.
  let r = await post('/auth/login', {}, { 'x-forwarded-for': '203.0.113.9' });
  assert.equal(r.status, 400);
  r = await post('/auth/link', {});
  assert.equal(r.status, 400);
});

test('forgot password: 5 requests per IP per 15 minutes, then 429', async () => {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await post('/auth/forgot-password', {});
    assert.equal(r.status, 400, `request ${i + 1}`);
  }
  const r = await post('/auth/forgot-password', {});
  assert.equal(r.status, 429);
});
