import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { formatCurrency, formatPercent } from '../formatters';
import { usePortfolioInsights } from '../hooks/useInsights';

// Signed delta vs. the prior period, direction-colored: up reads as error
// (more cost, more errors, more load) and down as success — same convention
// for all three stats, matching DashboardSummaryBanner's use of color.
function TrendDelta({ pct }) {
  if (pct === null || pct === undefined) {
    return (
      <Typography variant="caption" color="text.secondary">
        Not enough data yet
      </Typography>
    );
  }

  const Icon = pct > 0 ? TrendingUpIcon : pct < 0 ? TrendingDownIcon : TrendingFlatIcon;
  const color = pct > 0 ? 'error.main' : pct < 0 ? 'success.main' : 'text.secondary';

  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      <Icon fontSize="inherit" sx={{ color }} />
      <Typography variant="caption" sx={{ color }}>
        {pct === 0 ? 'Flat' : `${Math.abs(pct)}%`} vs last month
      </Typography>
    </Stack>
  );
}

function StatTile({ label, value, delta }) {
  return (
    <Card variant="outlined">
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ lineHeight: 1.15, mb: 0.5 }}>
          {value}
        </Typography>
        {delta}
      </Box>
    </Card>
  );
}

// Portfolio-wide counterpart to InsightsPanel — same computed-stats +
// AI-narrative pattern, aggregated across every agent instead of one, so an
// Executive sees the whole picture without opening an agent first.
export default function PortfolioInsightsPanel() {
  const { data: insights, isLoading, isError, refetch } = usePortfolioInsights();

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Portfolio Insights
      </Typography>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading portfolio insights…</Typography>
        </Stack>
      )}
      {isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
          Failed to load portfolio insights.
        </Alert>
      )}

      {insights && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))',
              gap: 1.5,
              mb: insights.stats.calls === 0 || insights.anomalies.length > 0 ? 2 : 0,
            }}
          >
            <StatTile
              label="No. of calls"
              value={insights.stats.calls}
              delta={insights.stats.calls > 0 && <TrendDelta pct={insights.trend.deltas.callsPct} />}
            />
            <StatTile
              label="Total cost"
              value={formatCurrency(insights.stats.cost)}
              delta={insights.stats.calls > 0 && <TrendDelta pct={insights.trend.deltas.costPct} />}
            />
            <StatTile
              label="Error rate"
              value={formatPercent(insights.stats.errorRate)}
              delta={insights.stats.calls > 0 && <TrendDelta pct={insights.trend.deltas.errorRatePct} />}
            />
          </Box>

          {insights.stats.calls === 0 && (
            <Alert severity="info">No usage logged yet across any agent.</Alert>
          )}

          {insights.anomalies.length > 0 && (
            <Stack spacing={1}>
              {insights.anomalies.map((a) => (
                <Alert key={`${a.day}-${a.metric}`} severity="warning">
                  {a.metric === 'cost'
                    ? `Cost spiked to ${formatCurrency(a.value)} on ${format(new Date(a.day), 'PP')} — well above the recent average of ${formatCurrency(a.baselineMean)}.`
                    : `Error rate spiked to ${formatPercent(a.value)} on ${format(new Date(a.day), 'PP')} — well above the recent average of ${formatPercent(a.baselineMean)}.`}
                </Alert>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}
