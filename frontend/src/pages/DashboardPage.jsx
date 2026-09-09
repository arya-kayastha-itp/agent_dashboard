import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import AgentCard from '../components/AgentCard';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import Legend from '../components/Legend';
import { computeAgentHealth, summarizeAgents } from '../agentHealth';
import { useAgents } from '../hooks/useAgents';

export default function DashboardPage() {
  const { data: agents, isLoading, isError } = useAgents();
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
      {isError && <Alert severity="error">Failed to load agents.</Alert>}

      {agents && agents.length === 0 && (
        <Alert severity="info">No agents yet. Click &quot;Add Agent&quot; to create the first one.</Alert>
      )}

      {agents && agents.length > 0 && (
        <>
          <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />
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
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </Box>
    </Box>
  );
}
