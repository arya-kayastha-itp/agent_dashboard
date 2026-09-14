import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeAgentHealth, sortBySeverity, summarizeAgents } from '../agentHealth';
import AgentSummaryRow from '../components/AgentSummaryRow';
import DashboardSummaryBanner from '../components/DashboardSummaryBanner';
import ErrorAlert from '../components/ErrorAlert';
import PortfolioInsightsPanel from '../components/PortfolioInsightsPanel';
import { useAgents } from '../hooks/useAgents';
import { useAgentsInsightsSummary } from '../hooks/useInsights';
import { usePageTitle } from '../hooks/usePageTitle';

const FLAGGED_LEVELS = ['atRisk', 'attention'];

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
      <Typography variant="h4">Portfolio Overview</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Read-only — a skim, not a workbench. Click any project for the full picture.
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

          <Paper variant="outlined">
            {visible.map((agent, idx) => {
              const level = computeAgentHealth(agent).level;
              const isFlagged = FLAGGED_LEVELS.includes(level);
              const prevFlagged = idx > 0 && FLAGGED_LEVELS.includes(computeAgentHealth(visible[idx - 1]).level);
              let sectionLabel = null;
              if (!healthFilter) {
                if (idx === 0) sectionLabel = isFlagged ? `Needs attention (${flaggedCount})` : 'All caught up';
                else if (!isFlagged && prevFlagged) sectionLabel = 'All caught up';
              }

              return (
                <Box key={agent.id}>
                  {sectionLabel && (
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ display: 'block', px: 3, pt: 2, pb: 0.5 }}
                    >
                      {sectionLabel}
                    </Typography>
                  )}
                  {idx > 0 && !sectionLabel && <Divider />}
                  <Box sx={{ px: 3, py: 1.75 }}>
                    <AgentSummaryRow
                      agent={agent}
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      insight={insightsSummary?.byAgent?.[agent.id]}
                    />
                  </Box>
                </Box>
              );
            })}
          </Paper>
        </>
      )}

      {agents && agents.length === 0 && <Alert severity="info">No agents yet.</Alert>}
    </Box>
  );
}
