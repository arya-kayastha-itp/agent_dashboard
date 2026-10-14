import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

// Shown wherever an agent appears while an assignee's update waits for
// review. The status and progress next to it are still the last approved ones.
// `compact` shortens the label for tight spots like the agent cards.
export default function PendingReviewChip({ agent, compact = false, sx }) {
  const count = agent.pendingReviewCount || 0;
  if (count === 0) return null;
  const word = compact ? 'pending' : 'pending review';

  return (
    <Tooltip title={`${count === 1 ? 'An update is' : `${count} updates are`} waiting for review. Status and progress show the last approved update.`}>
      <Chip
        size="small"
        variant="outlined"
        color="warning"
        icon={<HourglassTopIcon sx={{ fontSize: '13px !important' }} />}
        label={count === 1 ? word.charAt(0).toUpperCase() + word.slice(1) : `${count} ${word}`}
        sx={{ height: 22, fontWeight: 700, width: 'fit-content', ...sx }}
      />
    </Tooltip>
  );
}
