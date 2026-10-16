const test = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit } = require('../../src/middleware/rateLimit');

delete process.env.RATE_LIMITS;

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.set = (name, value) => {
    res.headers[name] = value;
    return res;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

// Runs one request through the limiter; true if it was let through.
function hit(limiter, ip) {
  let passed = false;
  const res = fakeRes();
  limiter({ ip }, res, () => {
    passed = true;
  });
  return { passed, res };
}

test('lets `max` requests through, then answers 429 with Retry-After', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 3, message: 'Slow down' });
  for (let i = 0; i < 3; i += 1) assert.equal(hit(limiter, '10.0.0.1').passed, true);

  const { passed, res } = hit(limiter, '10.0.0.1');
  assert.equal(passed, false);
  assert.equal(res.statusCode, 429);
  assert.deepEqual(res.body, { error: { message: 'Slow down', code: 'RATE_LIMITED' } });
  assert.ok(Number(res.headers['Retry-After']) > 0 && Number(res.headers['Retry-After']) <= 60);
});

test('counts each IP separately', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });
  assert.equal(hit(limiter, '10.0.0.1').passed, true);
  assert.equal(hit(limiter, '10.0.0.1').passed, false);
  assert.equal(hit(limiter, '10.0.0.2').passed, true);
});

test('a new window starts once the old one ends', async () => {
  const limiter = rateLimit({ windowMs: 40, max: 1 });
  assert.equal(hit(limiter, '10.0.0.1').passed, true);
  assert.equal(hit(limiter, '10.0.0.1').passed, false);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(hit(limiter, '10.0.0.1').passed, true);
});

test('RATE_LIMITS=off turns limiting off', (t) => {
  t.after(() => delete process.env.RATE_LIMITS);
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });
  process.env.RATE_LIMITS = 'off';
  for (let i = 0; i < 5; i += 1) assert.equal(hit(limiter, '10.0.0.1').passed, true);
});
