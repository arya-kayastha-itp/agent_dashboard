import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { computeAgentHealth } from '../agentHealth';
import { formatCurrency } from '../formatters';
import { HEALTH_LEVEL_META } from '../healthLevel';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

// The shared read-only row shape used by both the Executive's and the Agent
// Manager's agent lists (health icon, name + status, health caption,
// assignee, 30-day cost, progress bar), so the two views can't visually
// drift apart. `trailing` is where the Agent Manager's inline "Update"
// control slots in — Executive rows pass nothing and stay purely read-only.
export default function AgentSummaryRow({ agent, onClick, onNameClick, insight, trailing }) {
  const health = computeAgentHealth(agent);
  const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      onClick={onClick}
      sx={onClick ? { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } } : undefined}
    >
      <HealthIcon fontSize="small" color={healthColor} sx={{ flexShrink: 0 }} />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="subtitle1"
            onClick={onNameClick}
            sx={onNameClick ? { cursor: 'pointer', '&:hover': { textDecoration: 'underline' } } : undefined}
          >
            {agent.name}
          </Typography>
          <StatusBadge status={agent.currentStatus} />
        </Stack>
        <Typography variant="caption" color={`${healthColor}.main`}>
          {health.reason}
        </Typography>
      </Box>

      {agent.assignedTo && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ width: 140, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
        >
          {agent.assignedTo}
        </Typography>
      )}

      {insight && insight.calls > 0 && (
        <Box sx={{ width: 90, flexShrink: 0, display: { xs: 'none', lg: 'block' }, textAlign: 'right' }}>
          <Typography variant="body2">{formatCurrency(insight.cost)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {insight.calls} calls
          </Typography>
        </Box>
      )}

      <Box sx={{ width: 160, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
        <ProgressBar progress={agent.currentProgress} />
      </Box>

      {trailing}
    </Stack>
  );
}
