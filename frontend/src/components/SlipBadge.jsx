import EventBusyIcon from '@mui/icons-material/EventBusy';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

// Shown once an agent's target date has moved later more than once. `compact`
// is for tight spots like the agent cards.
export const SLIP_BADGE_MIN = 2;

export default function SlipBadge({ agent, compact = false, sx }) {
  const count = Number(agent.etaSlipCount) || 0;
  if (count < SLIP_BADGE_MIN) return null;
  const days = Number(agent.etaSlipDays) || 0;
  const delay = days > 0 ? `+${days} day${days === 1 ? '' : 's'}` : null;

  return (
    <Tooltip
      title={`The target date has moved later ${count} times${days > 0 ? ` — it's now ${days} day${days === 1 ? '' : 's'} later than first planned` : ''}.`}
    >
      <Chip
        size="small"
        variant="outlined"
        color="warning"
        icon={<EventBusyIcon sx={{ fontSize: '13px !important' }} />}
        label={compact ? `${count}×` : `Slipped ${count}×${delay ? ` · ${delay}` : ''}`}
        sx={{ height: 22, fontWeight: 700, width: 'fit-content', ...sx }}
      />
    </Tooltip>
  );
}
