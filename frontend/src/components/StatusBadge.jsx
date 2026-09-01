import Chip from '@mui/material/Chip';
import { STATUS_COLORS } from '../constants';

export default function StatusBadge({ status }) {
  return <Chip label={status} color={STATUS_COLORS[status] || 'default'} size="small" />;
}
