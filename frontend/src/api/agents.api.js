import client from './client';

export async function getAgents() {
  const { data } = await client.get('/agents');
  return data;
}

export async function getAgent(id) {
  const { data } = await client.get(`/agents/${id}`);
  return data;
}

export async function createAgent(payload) {
  const { data } = await client.post('/agents', payload);
  return data;
}

export async function updateAgent(id, payload) {
  const { data } = await client.patch(`/agents/${id}`, payload);
  return data;
}

export async function deleteAgent(id) {
  await client.delete(`/agents/${id}`);
}

export async function getAgentHistory(id, { from, to } = {}) {
  const { data } = await client.get(`/agents/${id}/history`, { params: { from, to } });
  return data;
}
