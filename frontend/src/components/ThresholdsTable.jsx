import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { ALERT_TYPE_LABELS } from '../constants';
import { formatCurrency, formatMinutes, formatPercent } from '../formatters';

export default function ThresholdsTable({ thresholds }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Applies to</TableCell>
            <TableCell>Alert type</TableCell>
            <TableCell align="right">Limit</TableCell>
            <TableCell align="right">Time window</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {thresholds.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.agentId ? row.agentName : 'All projects (default)'}</TableCell>
              <TableCell>{ALERT_TYPE_LABELS[row.alertType] || row.alertType}</TableCell>
              <TableCell align="right">
                {row.alertType === 'expensive_call' ? formatCurrency(row.thresholdValue) : formatPercent(row.thresholdValue, { precision: 0 })}
              </TableCell>
              <TableCell align="right">{row.windowMinutes ? formatMinutes(row.windowMinutes) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
