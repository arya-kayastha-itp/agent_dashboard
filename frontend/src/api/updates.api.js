import client from './client';

export async function getTodayUpdates() {
  const { data } = await client.get('/updates/today');
  return data;
}

export async function submitDailyUpdates(payload) {
  const { data } = await client.post('/updates/batch', payload);
  return data;
}

export async function submitUpdate(payload) {
  const { data } = await client.post('/updates', payload);
  return data;
}

export async function getAllUpdatesHistory() {
  const { data } = await client.get('/updates/history');
  return data;
}
