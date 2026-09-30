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
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AGENT_QUEUE_COLUMN_COUNT } from '../components/AgentQueueRow';
import SortableAgentRow from '../components/SortableAgentRow';
import AccentMark from '../components/AccentMark';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import { useAgents, useReorderAgents } from '../hooks/useAgents';
import { useTodayUpdates } from '../hooks/useDailySheet';
import { usePageTitle } from '../hooks/usePageTitle';

// The Agent Manager's Home: a severity-sorted action queue instead of a card
// grid, so the projects that actually need a decision today surface first —
// with an inline quick-update per row, and the full Daily Sheet still there
// for a deliberate bulk pass across everything at once.
//
// The Marketplace page reuses this exact view with `marketplaceOnly`, which
// narrows it to agents tagged for Marketplace Deployment.
export default function AgentManagerHomePage({ marketplaceOnly = false }) {
  usePageTitle(marketplaceOnly ? 'Marketplace' : 'Home');
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: todayRows } = useTodayUpdates();
  const [healthFilter, setHealthFilter] = useState(null);
  const reorderAgents = useReorderAgents();

  const scoped = useMemo(
    () => (marketplaceOnly ? (agents || []).filter((agent) => agent.marketplaceDeployment) : agents || []),
    [agents, marketplaceOnly],
  );
  const summary = useMemo(() => summarizeAgents(scoped), [scoped]);
  const sorted = useMemo(() => sortBySeverity(scoped), [scoped]);
  const visible = useMemo(() => {
    if (!healthFilter) return sorted;
    return sorted.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [sorted, healthFilter]);

  const sortedAgents = useMemo(() => visible, [visible]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = sortedAgents.map((a) => a.id);
    if (!ids.includes(over.id)) return;
    reorderAgents.mutate(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  const flaggedCount = summary.attention + summary.atRisk;
  const carriedOverCount = todayRows ? todayRows.filter((r) => !r.todayUpdate).length : null;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
        sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}
      >
        <Box>
          <AccentMark />
          <Typography variant="h4">{marketplaceOnly ? 'Marketplace Deployment' : 'Home'}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500 }}>
            {agents ? (
              flaggedCount === 0 ? (
                'Everything is on track — nothing needs you today.'
              ) : (
                <>
                  <Box component="b" sx={{ color: 'text.primary', fontWeight: 800 }}>
                    {`${flaggedCount} of ${scoped.length} projects`}
                  </Box>
                  {' need you today.'}
                </>
              )
            ) : (
              ' '
            )}
          </Typography>
        </Box>
        {!marketplaceOnly && (
          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1.25}>
            <Button component={RouterLink} to="/daily-sheet" variant="outlined">
              Open Daily Update Sheet →
            </Button>
            {todayRows && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    color: carriedOverCount === 0 ? 'success.main' : 'warning.main',
                    bgcolor: 'currentColor',
                    animation: carriedOverCount === 0 ? 'none' : 'g-pulse 2s ease-out infinite',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {carriedOverCount === 0 ? "Today's sheet: fully submitted" : "Today's sheet: not yet submitted"}
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
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

      {marketplaceOnly && agents && agents.length > 0 && scoped.length === 0 && (
        <Alert severity="info">
          No agents are tagged for Marketplace Deployment yet. Turn the tag on when adding or editing an agent.
        </Alert>
      )}

      {scoped.length > 0 && (
        <>
          <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 'max(400px, calc(100vh - 320px))', animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>Agent</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assignee</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 260 }}>Progress</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <SortableContext items={sortedAgents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                    {/* Reordering renumbers only the rows on screen — safe within a health
                        group, but on the Marketplace page it would scramble the hidden agents. */}
                    {sortedAgents.map((agent) => (
                      <SortableAgentRow key={agent.id} agent={agent} dragDisabled={marketplaceOnly} />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </TableContainer>
          </DndContext>
        </>
      )}
    </Box>
  );
}
