import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HEALTH_LEVELS } from '../healthLevel';
import HealthChip from './HealthChip';

const LEGEND_LEVELS = [HEALTH_LEVELS.HEALTHY, HEALTH_LEVELS.ATTENTION, HEALTH_LEVELS.AT_RISK];

export default function Legend() {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
      <Typography variant="caption" color="text.secondary">
        What the colors mean:
      </Typography>
      {LEGEND_LEVELS.map((level) => (
        <HealthChip key={level} level={level} />
      ))}
    </Stack>
  );
}
