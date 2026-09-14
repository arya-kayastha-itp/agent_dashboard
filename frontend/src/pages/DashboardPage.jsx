import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import AgentCard from '../components/AgentCard';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import Legend from '../components/Legend';
import PortfolioInsightsPanel from '../components/PortfolioInsightsPanel';
import { computeAgentHealth, summarizeAgents } from '../agentHealth';
import { PERSONAS } from '../constants';
import { useAgents } from '../hooks/useAgents';
import { useAgentsInsightsSummary } from '../hooks/useInsights';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePersona } from '../persona/PersonaContext';

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { persona } = usePersona();
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: insightsSummary } = useAgentsInsightsSummary();
  const [healthFilter, setHealthFilter] = useState(null);

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const visibleAgents = useMemo(() => {
    if (!agents || !healthFilter) return agents;
    return agents.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [agents, healthFilter]);

  return (
    <Box>
      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading projects…</Typography>
        </Stack>
      )}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load agents.</ErrorAlert>}

      {agents && agents.length === 0 && (
        <Alert severity="info">No agents yet. Click &quot;Add Agent&quot; to create the first one.</Alert>
      )}

      {agents && agents.length > 0 && (
        <>
          <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />
          {persona !== PERSONAS.AGENT_MANAGER && <PortfolioInsightsPanel />}
          <Legend />
        </>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 3,
        }}
      >
        {visibleAgents?.map((agent) => (
          <AgentCard key={agent.id} agent={agent} insights={insightsSummary?.byAgent?.[agent.id]} />
        ))}
      </Box>
    </Box>
  );
}
