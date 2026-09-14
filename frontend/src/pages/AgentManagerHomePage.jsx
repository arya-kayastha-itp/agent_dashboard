import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import AgentQueueRow from '../components/AgentQueueRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import { useAgents } from '../hooks/useAgents';
import { useTodayUpdates } from '../hooks/useDailySheet';
import { usePageTitle } from '../hooks/usePageTitle';

const FLAGGED_LEVELS = ['atRisk', 'attention'];

// The Agent Manager's Home: a severity-sorted action queue instead of a card
// grid, so the projects that actually need a decision today surface first —
// with an inline quick-update per row, and the full Daily Sheet still there
// for a deliberate bulk pass across everything at once.
export default function AgentManagerHomePage() {
  usePageTitle('Home');
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: todayRows } = useTodayUpdates();
  const [healthFilter, setHealthFilter] = useState(null);

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const sorted = useMemo(() => sortBySeverity(agents || []), [agents]);
  const visible = useMemo(() => {
    if (!healthFilter) return sorted;
    return sorted.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [sorted, healthFilter]);

  const flaggedCount = summary.attention + summary.atRisk;
  const carriedOverCount = todayRows ? todayRows.filter((r) => !r.todayUpdate).length : null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Home</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {agents
              ? flaggedCount === 0
                ? 'Everything is on track — nothing needs you today.'
                : `${flaggedCount} of ${agents.length} projects need you today.`
              : ' '}
          </Typography>
        </Box>
        <Stack alignItems="flex-end" spacing={0.5}>
          <Button component={RouterLink} to="/daily-sheet" variant="outlined">
            Open Daily Update Sheet →
          </Button>
          {todayRows && (
            <Typography variant="caption" color="text.secondary">
              {carriedOverCount === 0 ? "Today's sheet: fully submitted" : "Today's sheet: not yet submitted"}
            </Typography>
          )}
        </Stack>
      </Stack>

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

          <Paper variant="outlined">
            {visible.map((agent, idx) => {
              const level = computeAgentHealth(agent).level;
              const isFlagged = FLAGGED_LEVELS.includes(level);
              const prevFlagged = idx > 0 && FLAGGED_LEVELS.includes(computeAgentHealth(visible[idx - 1]).level);
              let sectionLabel = null;
              if (!healthFilter) {
                if (idx === 0) sectionLabel = isFlagged ? `Needs attention today (${flaggedCount})` : 'All caught up';
                else if (!isFlagged && prevFlagged) sectionLabel = 'All caught up';
              }

              return (
                <Box key={agent.id}>
                  {sectionLabel && (
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ display: 'block', px: { xs: 2, sm: 3 }, pt: 2, pb: 0.5 }}
                    >
                      {sectionLabel}
                    </Typography>
                  )}
                  {idx > 0 && !sectionLabel && <Divider />}
                  <AgentQueueRow agent={agent} />
                </Box>
              );
            })}
          </Paper>
        </>
      )}
    </Box>
  );
}
