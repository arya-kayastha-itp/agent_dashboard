import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
    <TableRow>
      <TableCell>
        <Typography variant="body2" fontWeight={600}>
          {agent.name}
        </Typography>
        {carriedOver && (
          <Typography variant="caption" color="text.secondary">
            Not updated yet today — please confirm below
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 180 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <StatusIcon fontSize="small" color={statusColor} />
          <TextField select fullWidth size="small" value={value.status} onChange={handleField('status')}>
            {STATUS_VALUES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </TableCell>
      <TableCell sx={{ minWidth: 240 }}>
        <ProgressSlider value={value.progress} onChange={(v) => onChange({ progress: v })} size="small" />
      </TableCell>
      <TableCell sx={{ minWidth: 220 }}>
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
