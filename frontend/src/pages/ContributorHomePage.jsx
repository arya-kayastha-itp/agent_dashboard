import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import { useMemo, useState } from 'react';
import { computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import AccentMark from '../components/AccentMark';
import ContributorAgentRow from '../components/ContributorAgentRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSubmissions } from '../hooks/useSubmissions';

// The Contributor's Home: the same rollup + worst-first list the Executive
// and Agent Manager get, but only the agents they're assigned to (the API
// returns nothing else to a contributor), with "Send update" on each row.
export default function ContributorHomePage() {
  usePageTitle('My Agents');
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const { data: mySubmissions } = useSubmissions();
  const [healthFilter, setHealthFilter] = useState(null);

  // Your own newest submission per agent (they arrive newest-first).
  const latestByAgent = useMemo(() => {
    const latest = new Map();
    (mySubmissions || []).forEach((submission) => {
      if (!latest.has(submission.agentId)) latest.set(submission.agentId, submission);
    });
    return latest;
  }, [mySubmissions]);

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const visible = useMemo(() => {
    const sorted = sortBySeverity(agents || []);
    return healthFilter ? sorted.filter((agent) => computeAgentHealth(agent).level === healthFilter) : sorted;
  }, [agents, healthFilter]);

  const sentBack = (agents || []).filter((agent) => latestByAgent.get(agent.id)?.reviewStatus === 'changes_requested').length;

  return (
    <Box>
      <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">My Agents</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500 }}>
          {agents && agents.length > 0 ? (
            <>
              {`${agents.length} agent${agents.length === 1 ? '' : 's'} assigned to you. `}
              {sentBack > 0 && (
                <Box component="b" sx={{ color: 'text.primary', fontWeight: 800 }}>
                  {`${sentBack} ${sentBack === 1 ? 'update was' : 'updates were'} sent back for changes. `}
                </Box>
              )}
              Updates you send are reviewed by the Agent Manager before the dashboard changes.
            </>
          ) : (
            ' '
          )}
        </Typography>
      </Box>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading your agents…</Typography>
        </Stack>
      )}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load your agents.</ErrorAlert>}

      {agents && agents.length === 0 && (
        <Alert severity="info">No agents are assigned to you yet. Ask your Agent Manager to add you to the agents you work on.</Alert>
      )}

      {agents && agents.length > 0 && (
        <>
          <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: 'max(400px, calc(100vh - 320px))', animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assignee</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 260 }}>Progress</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((agent) => (
                  <ContributorAgentRow key={agent.id} agent={agent} latest={latestByAgent.get(agent.id)} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
