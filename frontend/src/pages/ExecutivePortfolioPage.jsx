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
import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FLAGGED_HEALTH_LEVELS, computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import AgentSummaryRow from '../components/AgentSummaryRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import PortfolioInsightsPanel from '../components/PortfolioInsightsPanel';
import { useAgents } from '../hooks/useAgents';
import { useAgentsInsightsSummary } from '../hooks/useInsights';
import { usePageTitle } from '../hooks/usePageTitle';

const COLUMN_COUNT = 6;

// The Executive's Home: a rollup + every project, worst-first, in the same
// row shape and the same click-through-to-detail behavior the Agent
// Manager's queue uses — one consistent list UI across personas, the only
// difference being AgentDetailPage hides the edit form for this persona.
export default function ExecutivePortfolioPage() {
  usePageTitle('Home');
  const navigate = useNavigate();
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: insightsSummary } = useAgentsInsightsSummary();
  const [healthFilter, setHealthFilter] = useState(null);
  const [showCaughtUp, setShowCaughtUp] = useState(false);

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const sorted = useMemo(() => sortBySeverity(agents || []), [agents]);
  const visible = useMemo(() => {
    if (!healthFilter) return sorted;
    return sorted.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [sorted, healthFilter]);

  // Same consecutive-run grouping as the Agent Manager's queue — at most two
  // runs ("Needs attention" then "All caught up") since severity is the only
  // sort key.
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

  const flaggedCount = summary.attention + summary.atRisk;

  return (
    <Box>
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

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 32 }} />
                  <TableCell>Agent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assignee</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>This month</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 160 }}>Progress</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group, groupIdx) => {
                  // The caught-up bucket is collapsed by default so a growing
                  // pile of on-track/not-started agents doesn't push the
                  // flagged projects further down the page over time.
                  const isCollapsibleCaughtUp = !group.isFlagged && !healthFilter;

                  const rows = group.agents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      hover
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <AgentSummaryRow agent={agent} insight={insightsSummary?.byAgent?.[agent.id]} />
                    </TableRow>
                  ));

                  if (isCollapsibleCaughtUp) {
                    return (
                      <Fragment key={groupIdx}>
                        <TableRow>
                          <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0.5 }}>
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
                        {showCaughtUp && rows}
                      </Fragment>
                    );
                  }

                  return (
                    <Fragment key={groupIdx}>
                      {!healthFilter && (
                        <TableRow>
                          <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0.5 }}>
                            <Typography variant="overline" color="text.secondary">
                              Needs attention ({flaggedCount})
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {rows}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {agents && agents.length === 0 && <Alert severity="info">No agents yet.</Alert>}
    </Box>
  );
}
