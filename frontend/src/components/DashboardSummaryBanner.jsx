import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HEALTH_LEVELS } from '../healthLevel';
import HealthChip from './HealthChip';

function buildSummarySentence(summary) {
  const { total, onTrack, attention, atRisk } = summary;
  if (total === 0) return 'No projects yet.';

  const parts = [`${onTrack} of ${total} project${total === 1 ? '' : 's'} on track`];
  if (atRisk > 0) parts.push(`${atRisk} at risk`);
  if (attention > 0) parts.push(`${attention} need${attention === 1 ? 's' : ''} attention`);

  return `${parts.join(', ')}.`;
}

export default function DashboardSummaryBanner({ summary, activeFilter, onFilterChange }) {
  const handleToggle = (level) => {
    onFilterChange(activeFilter === level ? null : level);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {buildSummarySentence(summary)}
      </Typography>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        {summary.onTrack > 0 && (
          <span onClick={() => handleToggle(HEALTH_LEVELS.HEALTHY)} style={{ cursor: 'pointer' }}>
            <HealthChip level={HEALTH_LEVELS.HEALTHY} label={`${summary.onTrack} on track`} />
          </span>
        )}
        {summary.attention > 0 && (
          <span onClick={() => handleToggle(HEALTH_LEVELS.ATTENTION)} style={{ cursor: 'pointer' }}>
            <HealthChip level={HEALTH_LEVELS.ATTENTION} label={`${summary.attention} need attention`} />
          </span>
        )}
        {summary.atRisk > 0 && (
          <span onClick={() => handleToggle(HEALTH_LEVELS.AT_RISK)} style={{ cursor: 'pointer' }}>
            <HealthChip level={HEALTH_LEVELS.AT_RISK} label={`${summary.atRisk} at risk`} />
          </span>
        )}
      </Stack>

      {activeFilter && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Showing only "{HEALTH_LEVEL_LABEL(activeFilter)}" projects — click the chip again to show all.
        </Typography>
      )}
    </Paper>
  );
}

function HEALTH_LEVEL_LABEL(level) {
  return { healthy: 'On track', attention: 'Needs attention', atRisk: 'At risk' }[level] || level;
}
