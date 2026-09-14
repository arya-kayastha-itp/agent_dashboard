import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { Link, useParams } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import AgentUpdateForm from '../components/AgentUpdateForm';
import HistoryChart from '../components/HistoryChart';
import InfoTooltip from '../components/InfoTooltip';
import InsightsPanel from '../components/InsightsPanel';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { useAgentHistory } from '../hooks/useAgentHistory';
import { useAgents } from '../hooks/useAgents';
import { FIELD_LABELS } from '../labels';
import { usePersona } from '../persona/PersonaContext';
import { canEditAgents } from '../persona/permissions';

export default function AgentDetailPage() {
  const { id } = useParams();
  const { data: agents } = useAgents();
  const { data: history, isLoading, isError } = useAgentHistory(id);
  const { persona } = usePersona();

  const agent = agents?.find((a) => a.id === id);
  const health = agent ? computeAgentHealth(agent) : null;
  const healthMeta = health ? HEALTH_LEVEL_META[health.level] : null;

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
                  {FIELD_LABELS.assignedTo}: {agent.assignedTo}
                </Typography>
              )}
              {agent.eta && (
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {FIELD_LABELS.eta}: {format(new Date(agent.eta), 'PPP')}
                  </Typography>
                  <InfoTooltip title="The date this project is expected to be done" />
                </Stack>
              )}
              {agent.lastUpdateAt && (
                <Typography variant="body2" color="text.secondary">
                  Last updated: {format(new Date(agent.lastUpdateAt), 'PPP')}
                </Typography>
              )}
            </Box>
            <StatusBadge status={agent.currentStatus} />
          </Stack>

          {health && health.level !== HEALTH_LEVELS.NEUTRAL && (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.5 }}>
              <healthMeta.Icon fontSize="small" color={healthMeta.color} />
              <Typography variant="body2" fontWeight={600} color={`${healthMeta.color}.main`}>
                {health.level === HEALTH_LEVELS.HEALTHY ? 'This project is on track.' : health.reason}
              </Typography>
            </Stack>
          )}

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

      {agent && canEditAgents(persona) && <AgentUpdateForm agent={agent} />}

      {agent && <InsightsPanel agentId={id} />}

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
