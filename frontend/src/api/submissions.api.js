import client from './client';

// { status?, agentId? } — the API only returns a contributor's own submissions.
export async function getSubmissions(params = {}) {
  const { data } = await client.get('/submissions', { params });
  return data;
}

export async function createSubmission(payload) {
  const { data } = await client.post('/submissions', payload);
  return data;
}

// { decision: 'approve' | 'request_changes' | 'reject', comment?, edits? }
export async function reviewSubmission(id, payload) {
  const { data } = await client.post(`/submissions/${id}/review`, payload);
  return data;
}

export async function approveSubmissions(ids) {
  const { data } = await client.post('/submissions/approve', { ids });
  return data;
}
