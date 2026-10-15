import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { computeAgentHealth, daysBlocked, sortBySeverity, summarizeAgents } from '../agentHealth';
import AccentMark from '../components/AccentMark';
import AgentSummaryRow from '../components/AgentSummaryRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import { useAgents } from '../hooks/useAgents';
import { usePageTitle } from '../hooks/usePageTitle';

// The Executive's Home: a rollup + every project, worst-first, in the same
// row shape and the same click-through-to-detail behavior the Agent
// Manager's queue uses — one consistent list UI across personas, the only
// difference being AgentDetailPage hides the edit form for this persona.
//
// The Marketplace page reuses this exact view with `marketplaceOnly`, which
// narrows it to agents tagged for Marketplace Deployment.
export default function ExecutivePortfolioPage({ marketplaceOnly = false }) {
  usePageTitle(marketplaceOnly ? 'Marketplace' : 'Home');
  const navigate = useNavigate();
  const { data: agents, isLoading, isError, refetch } = useAgents();
  const [healthFilter, setHealthFilter] = useState(null);

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

  const flaggedCount = summary.attention + summary.atRisk;
  // Blocked past the escalation threshold — called out above everything else.
  const escalated = useMemo(() => scoped.filter((agent) => agent.blockerEscalated), [scoped]);

  return (
    <Box>
      {marketplaceOnly && (
        <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
          <AccentMark />
          <Typography variant="h4">Marketplace Deployment</Typography>
        </Box>
      )}

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading portfolio…</Typography>
        </Stack>
      )}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load agents.</ErrorAlert>}

      {marketplaceOnly && agents && agents.length > 0 && scoped.length === 0 && (
        <Alert severity="info">No agents are tagged for Marketplace Deployment yet.</Alert>
      )}

      {escalated.length > 0 && (
        <Alert severity="error" sx={{ mb: 2.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
          <AlertTitle sx={{ fontWeight: 800 }}>
            {escalated.length === 1 ? 'An agent has' : `${escalated.length} agents have`} been blocked too long
          </AlertTitle>
          <Stack spacing={0.75}>
            {escalated.map((agent) => (
              <Typography key={agent.id} variant="body2">
                <Link component={RouterLink} to={`/agents/${agent.id}`} color="inherit" sx={{ fontWeight: 800 }}>
                  {agent.name}
                </Link>
                {` — blocked ${daysBlocked(agent)} days`}
                {agent.blockedBy ? `, waiting on ${agent.blockedBy}` : ''}
                {agent.blockerReason ? `. ${agent.blockerReason}` : ''}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {scoped.length > 0 && (
        <>
          <DashboardSummaryBanner summary={summary} activeFilter={healthFilter} onFilterChange={setHealthFilter} />

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              maxHeight: marketplaceOnly ? 'max(360px, calc(100vh - 270px))' : 'max(360px, calc(100vh - 200px))',
              animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Agent</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assignee</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, width: 260 }}>Progress</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((agent, index) => (
                  <TableRow
                    key={agent.id}
                    hover
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    sx={(theme) => ({
                      cursor: 'pointer',
                      animation: 'g-rise 0.6s var(--g-ease) backwards',
                      animationDelay: `${Math.min(index, 12) * 45 + 200}ms`,
                      ...(agent.blockerEscalated ? { bgcolor: alpha(theme.palette.error.main, 0.06) } : {}),
                    })}
                  >
                    <AgentSummaryRow agent={agent} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {agents && agents.length === 0 && <Alert severity="info">No agents yet.</Alert>}
    </Box>
  );
}
