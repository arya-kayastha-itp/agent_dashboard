import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import { formatCurrency, formatPercent } from '../formatters';
import { usePortfolioInsights } from '../hooks/useInsights';
import AccentMark from './AccentMark';

// Signed delta vs. the prior period, direction-colored: up reads as error
// (more cost, more errors, more load) and down as success — same convention
// for all three stats, matching DashboardSummaryBanner's use of color.
function TrendDelta({ pct }) {
  if (pct === null || pct === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        Not enough data yet
      </Typography>
    );
  }

  const Icon = pct > 0 ? TrendingUpIcon : pct < 0 ? TrendingDownIcon : TrendingFlatIcon;
  const color = pct > 0 ? 'error.main' : pct < 0 ? 'success.main' : 'text.secondary';

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color }}>
      <Icon sx={{ fontSize: 18 }} />
      <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 800 }}>
        {pct === 0 ? 'Flat' : `${Math.abs(pct)}%`} vs last month
      </Typography>
    </Stack>
  );
}

function StatTile({ label, value, delta, Icon, index }) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 150, md: 190 },
        p: { xs: 2.25, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 2.5,
        animation: 'g-rise 0.7s var(--g-ease) backwards',
        animationDelay: `${index * 80}ms`,
        '&::after': {
          content: '""',
          position: 'absolute',
          right: '-30%',
          bottom: '-70%',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${alpha(theme.palette.primary.main, 0.16)}, transparent)`,
          pointerEvents: 'none',
        },
      })}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }} noWrap>
          {label}
        </Typography>
        <Box
          sx={(theme) => ({
            width: 30,
            height: 30,
            borderRadius: '9px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.14),
            color: 'var(--g-accent-text)',
          })}
        >
          <Icon sx={{ fontSize: 17 }} />
        </Box>
      </Stack>
      <Typography
        component="div"
        sx={{ fontFamily: 'var(--g-display)', fontWeight: 600, fontSize: { xs: 32, md: 44 }, lineHeight: 1, letterSpacing: '-0.04em' }}
      >
        {value}
      </Typography>
      <Box sx={{ minHeight: 22 }}>{delta}</Box>
    </Card>
  );
}

// Portfolio-wide counterpart to InsightsPanel — same computed-stats +
// AI-narrative pattern, aggregated across every agent instead of one, so an
// Executive sees the whole picture without opening an agent first.
export default function PortfolioInsightsPanel() {
  const { data: insights, isLoading, isError, refetch } = usePortfolioInsights();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 4, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">Portfolio Insights</Typography>
      </Box>

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
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 1.5, md: 2.5 },
              mb: insights.stats.calls === 0 || insights.anomalies.length > 0 ? 3 : 0,
            }}
          >
            <StatTile
              index={0}
              Icon={ShowChartIcon}
              label="No. of calls"
              value={insights.stats.calls}
              delta={insights.stats.calls > 0 && <TrendDelta pct={insights.trend.deltas.callsPct} />}
            />
            <StatTile
              index={1}
              Icon={PaymentsOutlinedIcon}
              label="Total cost"
              value={formatCurrency(insights.stats.cost)}
              delta={insights.stats.calls > 0 && <TrendDelta pct={insights.trend.deltas.costPct} />}
            />
            <StatTile
              index={2}
              Icon={ErrorOutlineIcon}
              label="Error rate"
              value={formatPercent(insights.stats.errorRate)}
              delta={insights.stats.calls > 0 && <TrendDelta pct={insights.trend.deltas.errorRatePct} />}
            />
          </Box>

          {insights.stats.calls === 0 && (
            <Alert severity="info">No usage logged yet across any agent.</Alert>
          )}

          {insights.anomalies.length > 0 && (
            <Stack spacing={1.25} sx={{ animation: 'g-rise 0.6s var(--g-ease) 0.4s backwards' }}>
              {insights.anomalies.map((a) => (
                <Alert key={`${a.day}-${a.metric}`} severity="warning" sx={{ fontSize: '0.94rem', py: 1 }}>
                  {a.metric === 'cost'
                    ? `Cost spiked to ${formatCurrency(a.value)} on ${format(new Date(a.day), 'PP')} — well above the recent average of ${formatCurrency(a.baselineMean)}.`
                    : `Error rate spiked to ${formatPercent(a.value)} on ${format(new Date(a.day), 'PP')} — well above the recent average of ${formatPercent(a.baselineMean)}.`}
                </Alert>
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
