import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import AccentMark from '../components/AccentMark';
import AgentCard from '../components/AgentCard';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { computeAgentHealth, summarizeAgents } from '../agentHealth';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';

// The full card grid — a drill-through page rather than anyone's Home. The
// Agent Manager's queue and the Executive's shortlist both already cover
// their day-to-day view of every agent; this is here for "just let me
// browse everything."
export default function AllAgentsPage() {
  usePageTitle('All Agents');
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const [healthFilter, setHealthFilter] = useState(null);

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const visibleAgents = useMemo(() => {
    if (!agents || !healthFilter) return agents;
    return agents.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [agents, healthFilter]);

  return (
    <Box>
      <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">All Agents</Typography>
      </Box>

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
        <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
          gap: 2,
        }}
      >
        {visibleAgents?.map((agent, index) => (
          <AgentCard key={agent.id} agent={agent} index={index} />
        ))}
      </Box>
    </Box>
  );
}
