import client from './client';

export async function getUsers() {
  const { data } = await client.get('/users');
  return data;
}

// Resolves to { account, link } — link is { url, purpose, expiresAt, emailed }.
export async function createUser(payload) {
  const { data } = await client.post('/users', payload);
  return data;
}

export async function sendNewLink(id) {
  const { data } = await client.post(`/users/${id}/link`);
  return data.link;
}

export async function updateUser(id, payload) {
  const { data } = await client.patch(`/users/${id}`, payload);
  return data;
}
