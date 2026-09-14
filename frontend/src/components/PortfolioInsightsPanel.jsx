import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { formatCurrency, formatPercent } from '../formatters';
import { usePortfolioInsights } from '../hooks/useInsights';

function TrendDelta({ label, pct }) {
  if (pct === null || pct === undefined) {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Not enough data yet
        </Typography>
      </Box>
    );
  }

  const Icon = pct > 0 ? TrendingUpIcon : pct < 0 ? TrendingDownIcon : TrendingFlatIcon;
  const color = pct > 0 ? 'error.main' : pct < 0 ? 'success.main' : 'text.secondary';

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Icon fontSize="inherit" sx={{ color }} />
        <Typography variant="body2" sx={{ color }}>
          {pct === 0 ? 'Flat' : `${Math.abs(pct)}%`}
        </Typography>
      </Stack>
    </Box>
  );
}

// Portfolio-wide counterpart to InsightsPanel — same computed-stats +
// AI-narrative pattern, aggregated across every agent instead of one, so an
// Executive sees the whole picture without opening an agent first.
export default function PortfolioInsightsPanel() {
  const { data: insights, isLoading, isError, refetch } = usePortfolioInsights();

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Portfolio Insights</Typography>
        {insights && (
          <Typography variant="caption" color="text.secondary">
            {insights.agentCount} agent{insights.agentCount === 1 ? '' : 's'} · last {insights.windowDays} days
          </Typography>
        )}
      </Stack>

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
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                No. of calls
              </Typography>
              <Typography variant="h6">{insights.stats.calls}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total cost
              </Typography>
              <Typography variant="h6">{formatCurrency(insights.stats.cost)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Error rate
              </Typography>
              <Typography variant="h6">{formatPercent(insights.stats.errorRate)}</Typography>
            </Box>
          </Stack>

          {insights.stats.calls === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No usage logged yet across any agent.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                This month vs. last month
              </Typography>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <TrendDelta label="Calls" pct={insights.trend.deltas.callsPct} />
                <TrendDelta label="Cost" pct={insights.trend.deltas.costPct} />
                <TrendDelta label="Error rate" pct={insights.trend.deltas.errorRatePct} />
              </Stack>

              {insights.anomalies.length > 0 && (
                <Stack spacing={1} sx={{ mb: 2 }}>
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

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Summary
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {insights.narrative.text}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Computed summary
          </Typography>
        </>
      )}
    </Paper>
  );
}
