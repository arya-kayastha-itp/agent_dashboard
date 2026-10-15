const test = require('node:test');
const assert = require('node:assert/strict');
const { needsBlockerDetails, requireBlockerDetails, requireEtaReason, isLater, cleanText } = require('../src/services/agent-rules.service');

test('becoming Blocked needs both a reason and who can unblock it', () => {
  assert.equal(needsBlockerDetails({ fromStatus: 'In Progress', toStatus: 'Blocked' }), true);
  assert.equal(needsBlockerDetails({ fromStatus: 'In Progress', toStatus: 'Blocked', blockerReason: 'No API keys' }), true);
  assert.equal(needsBlockerDetails({ fromStatus: 'In Progress', toStatus: 'Blocked', blockerReason: '  ', blockedBy: 'IT' }), true);
  assert.equal(needsBlockerDetails({ fromStatus: 'In Progress', toStatus: 'Blocked', blockerReason: 'No API keys', blockedBy: 'IT' }), false);
});

test('staying Blocked, or any other status, needs nothing', () => {
  assert.equal(needsBlockerDetails({ fromStatus: 'Blocked', toStatus: 'Blocked' }), false);
  assert.equal(needsBlockerDetails({ fromStatus: 'Blocked', toStatus: 'In Progress' }), false);
  assert.equal(needsBlockerDetails({ fromStatus: null, toStatus: 'Not Started' }), false);
});

test('the blocker error names the agent when given', () => {
  assert.throws(
    () => requireBlockerDetails({ fromStatus: 'In Progress', toStatus: 'Blocked', agentName: 'Billing Agent' }),
    (err) => err.status === 400 && err.code === 'BLOCKER_DETAILS_REQUIRED' && err.message.startsWith('Billing Agent: say'),
  );
});

test('only a later target date counts as a slip', () => {
  assert.equal(isLater('2026-12-10', '2026-11-30'), true);
  assert.equal(isLater('2026-11-20', '2026-11-30'), false);
  assert.equal(isLater('2026-11-30', '2026-11-30'), false);
  assert.equal(isLater('2026-12-10', null), false);
  assert.equal(isLater(null, '2026-11-30'), false);
});

test('a later target date needs a reason; earlier, first or cleared ones do not', () => {
  assert.throws(() => requireEtaReason({ fromEta: '2026-11-30', toEta: '2026-12-10' }), (err) => err.code === 'ETA_REASON_REQUIRED');
  assert.throws(() => requireEtaReason({ fromEta: '2026-11-30', toEta: '2026-12-10', reason: ' ' }), (err) => err.code === 'ETA_REASON_REQUIRED');
  requireEtaReason({ fromEta: '2026-11-30', toEta: '2026-12-10', reason: 'Vendor delay' });
  requireEtaReason({ fromEta: '2026-11-30', toEta: '2026-11-20' });
  requireEtaReason({ fromEta: null, toEta: '2026-11-20' });
  requireEtaReason({ fromEta: '2026-11-30', toEta: null });
});

test('blank text is stored as null, real text trimmed', () => {
  assert.equal(cleanText('  '), null);
  assert.equal(cleanText(undefined), null);
  assert.equal(cleanText('  Security team  '), 'Security team');
});
