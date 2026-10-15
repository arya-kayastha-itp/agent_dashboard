import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import AgentActivityPanel from '../components/AgentActivityPanel';
import AgentUpdateForm from '../components/AgentUpdateForm';
import AssigneeAvatars from '../components/AssigneeAvatars';
import DeleteAgentButton from '../components/DeleteAgentButton';
import EditAgentModal from '../components/EditAgentModal';
import ErrorAlert from '../components/ErrorAlert';
import EscalatedChip from '../components/EscalatedChip';
import EtaHistoryPanel from '../components/EtaHistoryPanel';
import HistoryChart from '../components/HistoryChart';
import InfoTooltip from '../components/InfoTooltip';
import InsightsPanel from '../components/InsightsPanel';
import MarketplaceTag from '../components/MarketplaceTag';
import PendingReviewChip from '../components/PendingReviewChip';
import ProgressRing from '../components/ProgressRing';
import SlipBadge from '../components/SlipBadge';
import StatusBadge from '../components/StatusBadge';
import SubmitUpdateForm from '../components/SubmitUpdateForm';
import { formatAssignees } from '../formatters';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { useAgentHistory } from '../hooks/useAgentHistory';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';
import { FIELD_LABELS } from '../labels';
import { usePersona } from '../persona/PersonaContext';
import { canEditAgents, canReviewUpdates, canSubmitUpdate } from '../persona/permissions';

// One labelled fact in the hero card (Owner / Target date / Last updated).
function MetaTile({ label, info, children }) {
  return (
    <Box sx={{ minWidth: 160, px: 1.75, py: 1.25, borderRadius: '12px', bgcolor: 'var(--g-surface-2)', border: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minHeight: 20 }}>
        <Typography
          variant="caption"
          sx={{ fontFamily: 'var(--g-mono)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.disabled' }}
        >
          {label}
        </Typography>
        {info}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, fontSize: '0.8125rem', fontWeight: 700 }}>
        {children}
      </Stack>
    </Box>
  );
}

export default function AgentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: agents } = useAgents();
  const { data: history, isLoading, isError, refetch } = useAgentHistory(id);
  const { persona, user } = usePersona();
  const [editOpen, setEditOpen] = useState(false);

  const agent = agents?.find((a) => a.id === id);
  const health = agent ? computeAgentHealth(agent) : null;
  const healthMeta = health ? HEALTH_LEVEL_META[health.level] : null;
  const canEdit = canEditAgents(persona);
  const canSubmit = canSubmitUpdate(persona, agent, user);
  const waitingForReview = canReviewUpdates(persona) ? agent?.pendingReviewCount || 0 : 0;
  const showHealth = health && health.level !== HEALTH_LEVELS.NEUTRAL;

  usePageTitle(agent?.name);

  // Deleted, a bad link, or (for contributors) an agent they aren't assigned to.
  if (agents && !agent) {
    return (
      <Box>
        <Alert
          severity="info"
          sx={{ mt: 2 }}
          action={
            <Button component={RouterLink} to="/" color="inherit" size="small">
              Back to Home
            </Button>
          }
        >
          This agent isn&apos;t available — it may have been deleted, or it isn&apos;t one of the agents assigned to you.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.default', py: 1.5, mb: 1.5 }}>
        <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextIcon sx={{ fontSize: 16 }} />}>
          <Link component={RouterLink} to="/" underline="hover" color="text.secondary" sx={{ fontWeight: 700 }}>
            Dashboard
          </Link>
          <Typography color="text.primary" sx={{ fontSize: 'inherit', fontWeight: 700 }}>
            {agent ? agent.name : 'Agent'}
          </Typography>
        </Breadcrumbs>
      </Box>

      {agent && (
        <Paper
          variant="outlined"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            p: { xs: 2.5, md: 3.5 },
            mb: 3,
            animation: 'g-rise 0.6s var(--g-ease) backwards',
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main' },
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }, gap: { xs: 3, md: 5 } }}>
            <Stack spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, wordBreak: 'break-word' }}>
                {agent.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                <MarketplaceTag agent={agent} sx={{ display: 'flex', width: 'fit-content' }} />
                <SlipBadge agent={agent} />
              </Stack>
              {agent.description && (
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.92rem', lineHeight: 1.55, maxWidth: 680 }}>
                  {agent.description}
                </Typography>
              )}
              {(agent.assignees?.length > 0 || agent.eta || agent.lastUpdateAt) && (
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ pt: 0.25 }}>
                  {agent.assignees?.length > 0 && (
                    <MetaTile label={FIELD_LABELS.assignedTo}>
                      <AssigneeAvatars agent={agent} size={22} />
                      <span>{formatAssignees(agent)}</span>
                    </MetaTile>
                  )}
                  {agent.eta && (
                    <MetaTile label={FIELD_LABELS.eta} info={<InfoTooltip title="The date this project is expected to be done" />}>
                      <EventOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                      <span>{format(new Date(agent.eta), 'PPP')}</span>
                    </MetaTile>
                  )}
                  {agent.lastUpdateAt && (
                    <MetaTile label="Last updated">
                      <ScheduleIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                      <span>{format(new Date(agent.lastUpdateAt), 'PPP')}</span>
                    </MetaTile>
                  )}
                </Stack>
              )}
              {canEdit && (
                <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ mt: 0.5 }} onClick={() => setEditOpen(true)}>
                  Edit Agent Details
                </Button>
              )}
            </Stack>

            <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={2.25}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PendingReviewChip agent={agent} sx={{ mr: 0.5 }} />
                <StatusBadge status={agent.currentStatus} />
                <DeleteAgentButton agent={agent} onDeleted={() => navigate('/')} />
              </Stack>
              <ProgressRing progress={agent.currentProgress} size={136} />
            </Stack>
          </Box>

          {(showHealth || agent.currentStatusDescription || agent.currentStatus === 'Blocked') && (
            <Stack spacing={1.75} sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              {showHealth && (
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={(theme) => {
                    const main = theme.palette[healthMeta.color].main;
                    return {
                      width: 'fit-content',
                      py: 1,
                      pl: 1.25,
                      pr: 1.75,
                      borderRadius: '11px',
                      color: main,
                      bgcolor: alpha(main, 0.11),
                      border: `1px solid ${alpha(main, 0.28)}`,
                    };
                  }}
                >
                  <healthMeta.Icon fontSize="small" />
                  <Typography variant="body2" fontWeight={800} sx={{ color: 'inherit' }}>
                    {health.level === HEALTH_LEVELS.HEALTHY ? 'This project is on track.' : health.reason}
                  </Typography>
                </Stack>
              )}

              {agent.currentStatus === 'Blocked' && (agent.blockerReason || agent.blockerEscalated) && (
                <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
                  <EscalatedChip agent={agent} />
                  {agent.blockerReason && (
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ fontWeight: 800 }}>
                        Why it&apos;s blocked:{' '}
                      </Box>
                      {agent.blockerReason}
                    </Typography>
                  )}
                </Stack>
              )}

              {agent.currentStatusDescription && (
                <Typography
                  variant="body1"
                  sx={{
                    position: 'relative',
                    pl: 4,
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    '&::before': {
                      content: '"\\201C"',
                      position: 'absolute',
                      left: 0,
                      top: -9,
                      fontFamily: 'var(--g-display)',
                      fontWeight: 700,
                      fontSize: 34,
                      lineHeight: 1,
                      color: 'var(--g-accent-text)',
                    },
                  }}
                >
                  {agent.currentStatusDescription}
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
      )}

      {waitingForReview > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button component={RouterLink} to="/review" color="inherit" size="small">
              Review
            </Button>
          }
        >
          {waitingForReview === 1 ? 'An update from an assignee is' : `${waitingForReview} updates from assignees are`} waiting for your
          review.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: agent && (canEdit || canSubmit) ? '400px minmax(0, 1fr)' : '1fr' },
          gap: 3,
          alignItems: 'start',
          mb: 3,
        }}
      >
        {agent && canEdit && <AgentUpdateForm agent={agent} />}
        {agent && canSubmit && <SubmitUpdateForm agent={agent} />}
        {agent && <InsightsPanel agentId={id} />}
      </Box>

      {agent && <EditAgentModal open={editOpen} onClose={() => setEditOpen(false)} agent={agent} />}

      <Paper variant="outlined" sx={{ p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.3s backwards' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Progress History
        </Typography>

        {isLoading && <CircularProgress />}
        {isError && <ErrorAlert onRetry={refetch}>Failed to load history.</ErrorAlert>}
        {history && history.length === 0 && <Alert severity="info">No history recorded yet.</Alert>}
        {history && history.length > 0 && <HistoryChart history={history} />}
      </Paper>

      <EtaHistoryPanel agentId={id} />
      {canReviewUpdates(persona) && <AgentActivityPanel agentId={id} />}
    </Box>
  );
}
