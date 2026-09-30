import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { formatCurrency, formatPercent } from '../formatters';
import { useAgentInsights } from '../hooks/useInsights';

const kickerSx = {
  fontFamily: 'var(--g-mono)',
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.disabled',
};

const tileSx = { px: 1.75, py: 1.5, borderRadius: '12px', bgcolor: 'var(--g-surface-2)', border: 1, borderColor: 'divider' };

// Higher = "worse to see rising" for that metric — flips arrow color logic
// between cost/error metrics (up is bad) and none of these have a "up is
// good" case today, but keeping this explicit rather than assuming.
function TrendDelta({ label, pct }) {
  if (pct === null || pct === undefined) {
    return (
      <Box sx={tileSx}>
        <Typography variant="caption" sx={kickerSx}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Not enough data yet
        </Typography>
      </Box>
    );
  }

  const Icon = pct > 0 ? TrendingUpIcon : pct < 0 ? TrendingDownIcon : TrendingFlatIcon;
  const color = pct > 0 ? 'error.main' : pct < 0 ? 'success.main' : 'text.secondary';

  return (
    <Box sx={tileSx}>
      <Typography variant="caption" sx={kickerSx}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75, color }}>
        <Icon sx={{ fontSize: 17 }} />
        <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 800 }}>
          {pct === 0 ? 'Flat' : `${Math.abs(pct)}%`}
        </Typography>
      </Stack>
    </Box>
  );
}

function Stat({ label, value }) {
  return (
    <Box sx={tileSx}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.75, fontFamily: 'var(--g-display)', fontWeight: 600, fontSize: '1.3rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function InsightsPanel({ agentId }) {
  const { data: insights, isLoading, isError } = useAgentInsights(agentId);

  return (
    <Paper variant="outlined" sx={{ p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.22s backwards' }}>
      <Typography variant="h6" sx={{ mb: 2.5 }}>
        Insights
      </Typography>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading insights…</Typography>
        </Stack>
      )}
      {isError && <Alert severity="error">Failed to load insights.</Alert>}

      {insights && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 2.5 }}>
            <Stat label="No. of calls" value={insights.stats.calls} />
            <Stat label="Total cost" value={formatCurrency(insights.stats.cost)} />
            <Stat label="Error rate" value={formatPercent(insights.stats.errorRate)} />
          </Box>

          {insights.stats.calls === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No usage logged yet for this agent.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.25 }}>
                This month vs. last month
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
                <TrendDelta label="Calls" pct={insights.trend.deltas.callsPct} />
                <TrendDelta label="Cost" pct={insights.trend.deltas.costPct} />
                <TrendDelta label="Error rate" pct={insights.trend.deltas.errorRatePct} />
              </Box>

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

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Summary
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.25, fontSize: '0.84rem', lineHeight: 1.65 }}>
            {insights.narrative.text}
          </Typography>
          <Typography variant="caption" sx={{ ...kickerSx, display: 'block', mb: 0.5 }}>
            Computed summary
          </Typography>
        </>
      )}
    </Paper>
  );
}
