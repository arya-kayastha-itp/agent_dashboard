const test = require('node:test');
const assert = require('node:assert/strict');
const { diff } = require('../src/services/audit.service');

const FIELDS = ['status', 'progress', 'statusDescription', 'eta'];

test('reports only the fields that changed, as from/to', () => {
  const before = { status: 'In Progress', progress: 40, statusDescription: 'Building', eta: '2026-11-30' };
  const after = { status: 'Blocked', progress: 40, statusDescription: 'Building', eta: '2026-12-10' };
  assert.deepEqual(diff(before, after, FIELDS), {
    status: { from: 'In Progress', to: 'Blocked' },
    eta: { from: '2026-11-30', to: '2026-12-10' },
  });
});

test('null, undefined and empty text count as the same (no change)', () => {
  assert.deepEqual(diff({ statusDescription: null }, { statusDescription: '' }, ['statusDescription']), {});
  assert.deepEqual(diff({ eta: undefined }, { eta: null }, ['eta']), {});
});

test('numbers compare by value whatever their type', () => {
  assert.deepEqual(diff({ progress: 50 }, { progress: '50' }, ['progress']), {});
  assert.deepEqual(diff({ progress: 50 }, { progress: 55 }, ['progress']), { progress: { from: 50, to: 55 } });
});

test('setting or clearing a value is a change', () => {
  assert.deepEqual(diff({ eta: null }, { eta: '2026-12-01' }, ['eta']), { eta: { from: null, to: '2026-12-01' } });
  assert.deepEqual(diff({ statusDescription: 'Old note' }, { statusDescription: '' }, ['statusDescription']), {
    statusDescription: { from: 'Old note', to: null },
  });
});

test('booleans are compared too (marketplace flag)', () => {
  assert.deepEqual(diff({ marketplaceDeployment: false }, { marketplaceDeployment: true }, ['marketplaceDeployment']), {
    marketplaceDeployment: { from: false, to: true },
  });
});
