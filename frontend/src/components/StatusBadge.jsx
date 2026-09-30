import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { STATUS_COLORS } from '../constants';

// Tinted chip with a leading dot; the dot pulses while work is In Progress.
export default function StatusBadge({ status }) {
  const live = status === 'In Progress';

  return (
    <Chip
      label={status}
      color={STATUS_COLORS[status] || 'default'}
      size="small"
      icon={
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'currentColor',
            animation: live ? 'g-pulse 2s ease-out infinite' : 'none',
          }}
        />
      }
      sx={{ height: 23, px: 0.25, '& .MuiChip-icon': { ml: 1, mr: -0.25 } }}
    />
  );
}
