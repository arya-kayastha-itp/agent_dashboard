import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { computeAgentHealth, summarizeAgents } from '../agentHealth';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import PortfolioInsightsPanel from '../components/PortfolioInsightsPanel';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import { HEALTH_LEVEL_META } from '../healthLevel';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';
import { FIELD_LABELS } from '../labels';

const FLAGGED_LEVELS = ['atRisk', 'attention'];

// The Executive's Home: a rollup + a short "needs attention" exception list
// — never the full card grid a Manager uses to do daily editing. Clicking a
// flagged project opens its detail inline (a slide-over), so exploring an
// exception never leaves this read-only skim.
export default function ExecutivePortfolioPage() {
  usePageTitle('Home');
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const [healthFilter, setHealthFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const shortlist = useMemo(() => {
    if (!agents) return [];
    const flagged = agents.filter((agent) => FLAGGED_LEVELS.includes(computeAgentHealth(agent).level));
    return healthFilter ? flagged.filter((agent) => computeAgentHealth(agent).level === healthFilter) : flagged;
  }, [agents, healthFilter]);

  const selected = agents?.find((agent) => agent.id === selectedId) || null;
  const selectedHealth = selected ? computeAgentHealth(selected) : null;

  return (
    <Box>
      <Typography variant="h4">Portfolio Overview</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Read-only — a skim, not a workbench. Click any flagged project for the full picture.
      </Typography>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading portfolio…</Typography>
        </Stack>
      )}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load agents.</ErrorAlert>}

      {agents && agents.length > 0 && (
        <>
          <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />

          <PortfolioInsightsPanel />

          <Paper variant="outlined" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ px: 3, pt: 2, pb: shortlist.length ? 0 : 2 }}>
              Needs attention ({shortlist.length})
            </Typography>
            {shortlist.length === 0 ? (
              <Typography color="text.secondary" sx={{ px: 3, pb: 2 }}>
                Nothing is flagged right now.
              </Typography>
            ) : (
              shortlist.map((agent, idx) => {
                const health = computeAgentHealth(agent);
                const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];
                return (
                  <Box key={agent.id}>
                    {idx > 0 && <Divider />}
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      onClick={() => setSelectedId(agent.id)}
                      sx={{ px: 3, py: 1.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <HealthIcon fontSize="small" color={healthColor} sx={{ flexShrink: 0 }} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1">{agent.name}</Typography>
                          <StatusBadge status={agent.currentStatus} />
                        </Stack>
                        <Typography variant="caption" color={`${healthColor}.main`}>
                          {health.reason}
                        </Typography>
                      </Box>
                      {agent.assignedTo && (
                        <Typography variant="body2" color="text.secondary" sx={{ width: 140, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
                          {agent.assignedTo}
                        </Typography>
                      )}
                      <Box sx={{ width: 140, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
                        <ProgressBar progress={agent.currentProgress} />
                      </Box>
                    </Stack>
                  </Box>
                );
              })
            )}
          </Paper>

          <Link component={RouterLink} to="/agents" underline="hover">
            View full agent list ({agents.length}) →
          </Link>
        </>
      )}

      {agents && agents.length === 0 && <Alert severity="info">No agents yet.</Alert>}

      <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected && selectedHealth && (
          <Box sx={{ width: 380, p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">{selected.name}</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusBadge status={selected.currentStatus} />
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setSelectedId(null)} aria-label="Close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            {selected.assignedTo && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {FIELD_LABELS.assignedTo}
                </Typography>
                <Typography variant="body2">{selected.assignedTo}</Typography>
              </Box>
            )}

            {selected.eta && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {FIELD_LABELS.eta}
                </Typography>
                <Typography variant="body2">{format(new Date(selected.eta), 'PPP')}</Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Progress
              </Typography>
              <ProgressBar progress={selected.currentProgress} />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.25,
                borderRadius: 2,
                bgcolor: `${HEALTH_LEVEL_META[selectedHealth.level].color}.light`,
                mb: 2,
              }}
            >
              <Typography variant="body2" fontWeight={600} color={`${HEALTH_LEVEL_META[selectedHealth.level].color}.dark`}>
                {selectedHealth.reason}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Link component={RouterLink} to={`/agents/${selected.id}`} underline="hover">
              Open full detail →
            </Link>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
