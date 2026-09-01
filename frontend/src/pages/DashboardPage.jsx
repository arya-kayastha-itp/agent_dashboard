import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AgentCard from '../components/AgentCard';
import { useAgents } from '../hooks/useAgents';

export default function DashboardPage() {
  const { data: agents, isLoading, isError } = useAgents();

  return (
    <Box>
      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">Failed to load agents.</Alert>}

      {agents && agents.length === 0 && (
        <Alert severity="info">No agents yet. Click &quot;Add Agent&quot; to create the first one.</Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 3,
        }}
      >
        {agents?.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </Box>
    </Box>
  );
}
