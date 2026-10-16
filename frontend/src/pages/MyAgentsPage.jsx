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
import AgentQueueRow from '../components/AgentQueueRow';
import ContributorAgentRow from '../components/ContributorAgentRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSubmissions } from '../hooks/useSubmissions';
import { usePersona } from '../persona/PersonaContext';
import { canEditAgents, isAssignedTo } from '../persona/permissions';

// The agents you're assigned to: a Contributor's Home, and an extra tab for
// FinOps people and the Agent Manager when they're assigned to agents too.
// The same rollup + worst-first list as the other homes. Contributors and
// FinOps get "Send update" (reviewed before it applies); the Agent Manager
// gets their usual inline "Update", which applies straight away.
export default function MyAgentsPage() {
  usePageTitle('My Agents');
  const { persona, user } = usePersona();
  const updatesDirectly = canEditAgents(persona);
  const { data: allAgents, isLoading, isError, refetch } = useAgents();
  // The Agent Manager's submissions list is everyone's, and they don't send any.
  const { data: mySubmissions } = useSubmissions({}, { enabled: !updatesDirectly });
  const [healthFilter, setHealthFilter] = useState(null);

  // Contributors only get their own agents from the API; everyone else gets
  // the whole portfolio, so pick out theirs.
  const agents = useMemo(() => allAgents?.filter((agent) => isAssignedTo(agent, user)), [allAgents, user]);

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
              {updatesDirectly
                ? 'Your updates apply straight away.'
                : 'Updates you send are reviewed by the Agent Manager before the dashboard changes.'}
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
        <Alert severity="info">
          {updatesDirectly
            ? "You're not assigned to any agents. Add yourself as an assignee on an agent to see it here."
            : 'No agents are assigned to you yet. Ask your Agent Manager to add you to the agents you work on.'}
        </Alert>
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
                {visible.map((agent) =>
                  updatesDirectly ? (
                    <AgentQueueRow key={agent.id} agent={agent} />
                  ) : (
                    <ContributorAgentRow key={agent.id} agent={agent} latest={latestByAgent.get(agent.id)} />
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
