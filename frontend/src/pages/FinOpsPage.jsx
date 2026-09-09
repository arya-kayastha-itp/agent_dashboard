import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AlertsList from '../components/AlertsList';
import InfoTooltip from '../components/InfoTooltip';
import Legend from '../components/Legend';
import UsageCostChart from '../components/UsageCostChart';
import { formatCurrency } from '../formatters';
import { useUsageSummary } from '../hooks/useUsage';

export default function FinOpsPage() {
  const { data: summary, isLoading, isError } = useUsageSummary();

  const totals = summary?.reduce(
    (acc, row) => ({ cost: acc.cost + Number(row.cost), calls: acc.calls + row.calls, errors: acc.errors + row.errors }),
    { cost: 0, calls: 0, errors: 0 },
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Cost &amp; Reliability
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        How much your AI agents are costing, and how often their calls are failing.
      </Typography>
      <Legend />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Usage &amp; cost (last 14 days)
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading usage…</Typography>
          </Stack>
        )}
        {isError && <Alert severity="error">Failed to load usage summary.</Alert>}
        {summary && summary.length === 0 && <Alert severity="info">No usage logged yet.</Alert>}

        {summary && summary.length > 0 && (
          <>
            <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total cost
                </Typography>
                <Typography variant="h6">{formatCurrency(totals.cost)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total calls
                </Typography>
                <Typography variant="h6">{totals.calls}</Typography>
              </Box>
              <Box>
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Failed calls
                  </Typography>
                  <InfoTooltip title="Calls where something went wrong — either the AI service failed, or the request sent to it was invalid." />
                </Stack>
                <Typography variant="h6">{totals.errors}</Typography>
              </Box>
            </Stack>
            <UsageCostChart summary={summary} />
          </>
        )}
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Alerts
      </Typography>
      <AlertsList />
    </Box>
  );
}
