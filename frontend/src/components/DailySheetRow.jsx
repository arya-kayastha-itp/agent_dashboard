import ScheduleIcon from '@mui/icons-material/Schedule';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { STATUS_VALUES } from '../constants';
import { HEALTH_LEVEL_META, statusToHealthLevel } from '../healthLevel';
import ProgressSlider from './ProgressSlider';

export default function DailySheetRow({ agent, value, carriedOver, onChange }) {
  // onChange receives just the changed field(s); the page merges them into the
  // latest state, so a quick second edit can't overwrite the first with a
  // stale copy of this row.
  const handleField = (field) => (event) => onChange({ [field]: event.target.value });
  const { Icon: StatusIcon, color: statusColor } = HEALTH_LEVEL_META[statusToHealthLevel(value.status)];

  return (
    <TableRow
      hover
      sx={(theme) =>
        carriedOver
          ? { backgroundImage: `linear-gradient(90deg, ${alpha(theme.palette.warning.main, 0.07)}, transparent 40%)` }
          : {}
      }
    >
      <TableCell sx={{ py: 1.25, verticalAlign: 'top' }}>
        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.84rem', pt: 0.5 }}>
          {agent.name}
        </Typography>
        {carriedOver && (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25, color: 'warning.main' }}>
            <ScheduleIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700 }}>
              Not updated yet today — please confirm below
            </Typography>
          </Stack>
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 170, py: 1.25, verticalAlign: 'top' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusIcon fontSize="small" color={statusColor === 'default' ? 'disabled' : statusColor} />
          <TextField select fullWidth size="small" value={value.status} onChange={handleField('status')}>
            {STATUS_VALUES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </TableCell>
      <TableCell sx={{ minWidth: 220, py: 1.25, verticalAlign: 'top' }}>
        <ProgressSlider value={value.progress} onChange={(v) => onChange({ progress: v })} size="small" />
      </TableCell>
      <TableCell sx={{ minWidth: 260, py: 1.25, verticalAlign: 'top' }}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={1}
          value={value.statusDescription}
          onChange={handleField('statusDescription')}
        />
      </TableCell>
    </TableRow>
  );
}
