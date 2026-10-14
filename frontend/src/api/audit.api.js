import client from './client';

// { agentId?, personId?, cursor?, limit? } → { events, nextCursor } (newest first).
export async function getAuditEvents(params = {}) {
  const { data } = await client.get('/audit', { params });
  return data;
}
