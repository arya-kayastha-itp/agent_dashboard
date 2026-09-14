import Chip from '@mui/material/Chip';
import { HEALTH_LEVEL_META } from '../healthLevel';

export default function HealthChip({ level, label, size = 'small', onClick, selected }) {
  const meta = HEALTH_LEVEL_META[level] || HEALTH_LEVEL_META.neutral;
  const { Icon } = meta;
  return (
    <Chip
      size={size}
      color={meta.color}
      icon={<Icon />}
      label={label || meta.label}
      onClick={onClick}
      variant={onClick && !selected ? 'outlined' : 'filled'}
      aria-pressed={onClick ? Boolean(selected) : undefined}
    />
  );
}
