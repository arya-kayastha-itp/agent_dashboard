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
import { useNavigate } from 'react-router-dom';
import { computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import AgentSummaryRow from '../components/AgentSummaryRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
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

  const summary = useMemo(() => summarizeAgents(agents || []), [agents]);
  const sorted = useMemo(() => sortBySeverity(agents || []), [agents]);
  const visible = useMemo(() => {
    if (!healthFilter) return sorted;
    return sorted.filter((agent) => computeAgentHealth(agent).level === healthFilter);
  }, [sorted, healthFilter]);

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

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 220px)' }}>
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
                {visible.map((agent) => (
                  <TableRow
                    key={agent.id}
                    hover
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <AgentSummaryRow agent={agent} insight={insightsSummary?.byAgent?.[agent.id]} />
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
