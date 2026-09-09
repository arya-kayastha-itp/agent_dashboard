import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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
import { useState } from 'react';
import { formatCurrency, formatPercent } from '../formatters';
import { useAgentInsights, useRegenerateNarrative } from '../hooks/useInsights';

// Higher = "worse to see rising" for that metric — flips arrow color logic
// between cost/error metrics (up is bad) and none of these have a "up is
// good" case today, but keeping this explicit rather than assuming.
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

export default function InsightsPanel({ agentId }) {
  const { data: insights, isLoading, isError } = useAgentInsights(agentId);
  const { mutate: regenerate, isPending } = useRegenerateNarrative(agentId);
  const [aiNarrative, setAiNarrative] = useState(null);
  const [aiError, setAiError] = useState(null);

  const handleRegenerate = () => {
    setAiError(null);
    regenerate(undefined, {
      onSuccess: (data) => setAiNarrative(data),
      onError: (err) => setAiError(err?.response?.data?.error?.message || 'Could not generate an AI summary.'),
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
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
              No usage logged yet for this agent.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Last 7 days vs. prior 7 days
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
            {aiNarrative?.text ?? insights.narrative.text}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {aiNarrative ? `AI-generated · ${aiNarrative.model}` : 'Computed summary'}
          </Typography>

          {aiError && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {aiError}
            </Alert>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={isPending ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
            disabled={isPending}
            onClick={handleRegenerate}
          >
            {isPending ? 'Generating…' : 'Regenerate with AI'}
          </Button>
        </>
      )}
    </Paper>
  );
}
