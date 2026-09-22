import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Fragment, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AGENT_QUEUE_COLUMN_COUNT } from '../components/AgentQueueRow';
import SortableAgentRow from '../components/SortableAgentRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { FLAGGED_HEALTH_LEVELS, computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import { useAgents, useReorderAgents } from '../hooks/useAgents';
import { useTodayUpdates } from '../hooks/useDailySheet';
import { useAgentsInsightsSummary } from '../hooks/useInsights';
import { usePageTitle } from '../hooks/usePageTitle';

// The Agent Manager's Home: a severity-sorted action queue instead of a card
// grid, so the projects that actually need a decision today surface first —
// with an inline quick-update per row, and the full Daily Sheet still there
// for a deliberate bulk pass across everything at once.
export default function AgentManagerHomePage() {
  usePageTitle('Home');
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: todayRows } = useTodayUpdates();
  const { data: insightsSummary } = useAgentsInsightsSummary();
  const [healthFilter, setHealthFilter] = useState(null);
  const [showCaughtUp, setShowCaughtUp] = useState(false);
  const reorderAgents = useReorderAgents();

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const sorted = useMemo(() => sortBySeverity(agents || []), [agents]);
  const visible = useMemo(() => {
    if (!healthFilter) return sorted;
    return sorted.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [sorted, healthFilter]);

  // Consecutive runs of the same flagged/not-flagged state — at most two
  // ("Needs attention today" then "All caught up"), since severity is
  // always the primary sort. Each run is its own drag-and-drop group so
  // reordering can't cross into the other severity band.
  const groups = useMemo(() => {
    const out = [];
    visible.forEach((agent) => {
      const isFlagged = FLAGGED_HEALTH_LEVELS.includes(computeAgentHealth(agent).level);
      const last = out[out.length - 1];
      if (last && last.isFlagged === isFlagged) {
        last.agents.push(agent);
      } else {
        out.push({ isFlagged, agents: [agent] });
      }
    });
    return out;
  }, [visible]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const group = groups.find((g) => g.agents.some((a) => a.id === active.id));
    if (!group) return;
    const ids = group.agents.map((a) => a.id);
    if (!ids.includes(over.id)) return;
    reorderAgents.mutate(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  const flaggedCount = summary.attention + summary.atRisk;
  const carriedOverCount = todayRows ? todayRows.filter((r) => !r.todayUpdate).length : null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell sx={{ width: 32 }} />
                    <TableCell>Agent</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assignee</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>This month</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 160 }}>Progress</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((group, groupIdx) => {
                    // The caught-up bucket is collapsed by default so a growing
                    // pile of on-track/not-started agents can't push the list
                    // that actually needs a decision further down the page.
                    const isCollapsibleCaughtUp = !group.isFlagged && !healthFilter;

                    if (isCollapsibleCaughtUp) {
                      return (
                        <Fragment key={groupIdx}>
                          <TableRow>
                            <TableCell colSpan={AGENT_QUEUE_COLUMN_COUNT} sx={{ py: 0.5 }}>
                              <Button
                                size="small"
                                color="inherit"
                                onClick={() => setShowCaughtUp((s) => !s)}
                                startIcon={showCaughtUp ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                sx={{ color: 'text.secondary', fontWeight: 400 }}
                              >
                                All caught up ({group.agents.length})
                              </Button>
                            </TableCell>
                          </TableRow>
                          {showCaughtUp && (
                            <SortableContext items={group.agents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                              {group.agents.map((agent) => (
                                <SortableAgentRow key={agent.id} agent={agent} insight={insightsSummary?.byAgent?.[agent.id]} />
                              ))}
                            </SortableContext>
                          )}
                        </Fragment>
                      );
                    }

                    return (
                      <Fragment key={groupIdx}>
                        {!healthFilter && (
                          <TableRow>
                            <TableCell colSpan={AGENT_QUEUE_COLUMN_COUNT} sx={{ py: 0.5 }}>
                              <Typography variant="overline" color="text.secondary">
                                Needs attention today ({flaggedCount})
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        <SortableContext items={group.agents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                          {group.agents.map((agent) => (
                            <SortableAgentRow key={agent.id} agent={agent} insight={insightsSummary?.byAgent?.[agent.id]} />
                          ))}
                        </SortableContext>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DndContext>
        </>
      )}
    </Box>
  );
}
