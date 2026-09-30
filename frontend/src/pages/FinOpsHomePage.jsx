import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccentMark from '../components/AccentMark';
import AgentCostTable from '../components/AgentCostTable';
import AlertsList from '../components/AlertsList';
import ErrorAlert from '../components/ErrorAlert';
import InfoTooltip from '../components/InfoTooltip';
import UsageCostChart from '../components/UsageCostChart';
import { formatCurrency } from '../formatters';
import { useAgents } from '../hooks/useAgents';
import { useAgentsInsightsSummary } from '../hooks/useInsights';
import { usePageTitle } from '../hooks/usePageTitle';
import { useUsageSummary } from '../hooks/useUsage';

function Total({ label, value, info }) {
  return (
    <Box sx={{ px: 2.25, py: 1.75, borderRadius: '13px', bgcolor: 'var(--g-surface-2)', border: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minHeight: 20 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>
          {label}
        </Typography>
        {info}
      </Stack>
      <Typography sx={{ mt: 0.75, fontFamily: 'var(--g-display)', fontWeight: 600, fontSize: '1.4rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
        {value}
      </Typography>
    </Box>
  );
}

// FinOps's Home: alerts triaged first (the thing that actually needs a
// decision today), the cost/reliability trend second, and a per-agent
// breakdown third — Pricing and Alert Rules moved out to the Configure menu
// since those are occasional setup tasks, not part of this daily loop.
export default function FinOpsHomePage() {
  usePageTitle('Home');
  const { data: summary, isLoading, isError, refetch } = useUsageSummary();
  const { data: agents } = useAgents();
  const { data: insightsSummary } = useAgentsInsightsSummary();

  const totals = summary?.reduce(
    (acc, row) => ({ cost: acc.cost + Number(row.cost), calls: acc.calls + row.calls, errors: acc.errors + row.errors }),
    { cost: 0, calls: 0, errors: 0 },
  );

  return (
    <Box>
      <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">Cost &amp; Reliability</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500 }}>
          How much your AI agents are costing, and how often their calls are failing.
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <AlertsList title="Alerts" />
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}>
        <Typography variant="h6" sx={{ mb: 2.5 }}>
          Usage &amp; cost (last 14 days)
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading usage…</Typography>
          </Stack>
        )}
        {isError && <ErrorAlert onRetry={refetch}>Failed to load usage summary.</ErrorAlert>}
        {summary && summary.length === 0 && <Alert severity="info">No usage logged yet.</Alert>}

        {summary && summary.length > 0 && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}>
              <Total label="Total cost" value={formatCurrency(totals.cost)} />
              <Total label="Total calls" value={totals.calls} />
              <Total
                label="Failed calls"
                value={totals.errors}
                info={<InfoTooltip title="Calls where something went wrong — either the AI service failed, or the request sent to it was invalid." />}
              />
            </Box>
            <UsageCostChart summary={summary} />
          </>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.25s backwards' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Per-agent breakdown
        </Typography>
        {agents && insightsSummary ? (
          <AgentCostTable agents={agents} insightsByAgent={insightsSummary.byAgent} />
        ) : (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading breakdown…</Typography>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
