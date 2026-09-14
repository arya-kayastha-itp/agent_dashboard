import client from './client';

export async function getPortfolioInsights({ days } = {}) {
  const { data } = await client.get('/insights/portfolio', { params: { days } });
  return data;
}

export async function regeneratePortfolioNarrative() {
  const { data } = await client.post('/insights/portfolio/narrative');
  return data;
}

export async function getAgentsInsightsSummary({ days } = {}) {
  const { data } = await client.get('/insights/by-agent', { params: { days } });
  return data;
}
