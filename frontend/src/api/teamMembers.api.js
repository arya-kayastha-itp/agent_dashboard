import client from './client';

export async function getTeamMembers() {
  const { data } = await client.get('/team-members');
  return data;
}

export async function createTeamMember(payload) {
  const { data } = await client.post('/team-members', payload);
  return data;
}

export async function deleteTeamMember(id) {
  await client.delete(`/team-members/${id}`);
}
