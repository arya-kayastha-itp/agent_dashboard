import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { STATUS_VALUES } from '../constants';

export default function DailySheetRow({ agent, value, carriedOver, onChange }) {
  const handleField = (field) => (event) => onChange({ ...value, [field]: event.target.value });

  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" fontWeight={600}>
          {agent.name}
        </Typography>
        {carriedOver && (
          <Typography variant="caption" color="text.secondary">
            carried over — please confirm
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 160 }}>
        <TextField select fullWidth size="small" value={value.status} onChange={handleField('status')}>
          {STATUS_VALUES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ minWidth: 160 }}>
        <Slider
          value={value.progress}
          onChange={(_, v) => onChange({ ...value, progress: v })}
          valueLabelDisplay="auto"
          step={5}
          min={0}
          max={100}
        />
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
