import client from './client';

// login and setPassword both resolve to a session: { token, persona, user }.
export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

// { purpose: 'invite' | 'reset', name, email } for a usable link.
export async function describeLink(token) {
  const { data } = await client.post('/auth/link', { token });
  return data;
}

export async function setPassword(token, password) {
  const { data } = await client.post('/auth/set-password', { token, password });
  return data;
}

export async function requestPasswordReset(email) {
  await client.post('/auth/forgot-password', { email });
}
