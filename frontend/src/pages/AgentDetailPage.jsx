import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { Link, useParams } from 'react-router-dom';
import AgentUpdateForm from '../components/AgentUpdateForm';
import HistoryChart from '../components/HistoryChart';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import { useAgentHistory } from '../hooks/useAgentHistory';
import { useAgents } from '../hooks/useAgents';

export default function AgentDetailPage() {
  const { id } = useParams();
  const { data: agents } = useAgents();
  const { data: history, isLoading, isError } = useAgentHistory(id);

  const agent = agents?.find((a) => a.id === id);

  return (
    <Box>
      <Button component={Link} to="/" sx={{ mb: 2 }}>
        &larr; Back to Dashboard
      </Button>

      {agent && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h4">{agent.name}</Typography>
              {agent.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {agent.description}
                </Typography>
              )}
              {agent.assignedTo && (
                <Typography variant="body2" color="text.secondary">
                  Assigned to: {agent.assignedTo}
                </Typography>
              )}
              {agent.eta && (
                <Typography variant="body2" color="text.secondary">
                  ETA: {agent.eta.slice(0, 10)}
                </Typography>
              )}
              {agent.lastUpdateAt && (
                <Typography variant="body2" color="text.secondary">
                  Last updated: {format(new Date(agent.lastUpdateAt), 'PPP')}
                </Typography>
              )}
            </Box>
            <StatusBadge status={agent.currentStatus} />
          </Stack>

          <Box sx={{ mt: 2, maxWidth: 400 }}>
            <ProgressBar progress={agent.currentProgress} />
          </Box>

          {agent.currentStatusDescription && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {agent.currentStatusDescription}
            </Typography>
          )}
        </Paper>
      )}

      {agent && <AgentUpdateForm agent={agent} />}

      <Typography variant="h6" sx={{ mb: 1 }}>
        Progress History
      </Typography>

      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">Failed to load history.</Alert>}
      {history && history.length === 0 && <Alert severity="info">No history recorded yet.</Alert>}
      {history && history.length > 0 && <HistoryChart history={history} />}
    </Box>
  );
}
