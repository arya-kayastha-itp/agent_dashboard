import client from './client';

export async function getUsageSummary({ agentId, from, to } = {}) {
  const { data } = await client.get('/finops/usage/summary', { params: { agentId, from, to } });
  return data;
}

export async function getUsageLogs({ agentId, from, to, status } = {}) {
  const { data } = await client.get('/finops/usage', { params: { agentId, from, to, status } });
  return data;
}

export async function getAlerts({ status } = {}) {
  const { data } = await client.get('/finops/alerts', { params: { status } });
  return data;
}

export async function updateAlertStatus(id, status) {
  const { data } = await client.patch(`/finops/alerts/${id}`, { status });
  return data;
}

export async function getPricing() {
  const { data } = await client.get('/finops/pricing');
  return data;
}

export async function createPricing(payload) {
  const { data } = await client.post('/finops/pricing', payload);
  return data;
}

export async function getThresholds() {
  const { data } = await client.get('/finops/thresholds');
  return data;
}

export async function upsertThreshold(payload) {
  const { data } = await client.put('/finops/thresholds', payload);
  return data;
}
