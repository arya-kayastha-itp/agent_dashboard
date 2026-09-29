import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import AgentUpdateForm from '../components/AgentUpdateForm';
import DeleteAgentButton from '../components/DeleteAgentButton';
import EditAgentModal from '../components/EditAgentModal';
import ErrorAlert from '../components/ErrorAlert';
import HistoryChart from '../components/HistoryChart';
import InfoTooltip from '../components/InfoTooltip';
import InsightsPanel from '../components/InsightsPanel';
import MarketplaceTag from '../components/MarketplaceTag';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import { formatAssignees } from '../formatters';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { useAgentHistory } from '../hooks/useAgentHistory';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';
import { FIELD_LABELS } from '../labels';
import { usePersona } from '../persona/PersonaContext';
import { canEditAgents } from '../persona/permissions';

export default function AgentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: agents } = useAgents();
  const { data: history, isLoading, isError, refetch } = useAgentHistory(id);
  const { persona } = usePersona();
  const [editOpen, setEditOpen] = useState(false);

  const agent = agents?.find((a) => a.id === id);
  const health = agent ? computeAgentHealth(agent) : null;
  const healthMeta = health ? HEALTH_LEVEL_META[health.level] : null;

  usePageTitle(agent?.name);

  return (
    <Box>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.default', py: 1.5, mb: 1 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary">{agent ? agent.name : 'Agent'}</Typography>
        </Breadcrumbs>
      </Box>

      {agent && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h4">{agent.name}</Typography>
              <MarketplaceTag agent={agent} sx={{ display: 'flex', width: 'fit-content', mt: 0.75 }} />
              {agent.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {agent.description}
                </Typography>
              )}
              {agent.assignees?.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {FIELD_LABELS.assignedTo}: {formatAssignees(agent)}
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
              {canEditAgents(persona) && (
                <Button size="small" sx={{ mt: 1 }} onClick={() => setEditOpen(true)}>
                  Edit Agent Details
                </Button>
              )}
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <StatusBadge status={agent.currentStatus} />
              <DeleteAgentButton agent={agent} onDeleted={() => navigate('/')} />
            </Stack>
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

      {agent && <EditAgentModal open={editOpen} onClose={() => setEditOpen(false)} agent={agent} />}

      {agent && <InsightsPanel agentId={id} />}

      <Typography variant="h6" sx={{ mb: 1 }}>
        Progress History
      </Typography>

      {isLoading && <CircularProgress />}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load history.</ErrorAlert>}
      {history && history.length === 0 && <Alert severity="info">No history recorded yet.</Alert>}
      {history && history.length > 0 && <HistoryChart history={history} />}
    </Box>
  );
}
