import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { useMemo, useState } from 'react';
import { ALERT_TYPE_LABELS } from '../constants';
import { formatCurrency, formatMinutes, formatPercent } from '../formatters';
import { useSortableData } from '../hooks/useSortableData';

const COLUMNS = [
  { key: 'appliesTo', label: 'Applies to' },
  { key: 'alertType', label: 'Alert type' },
  { key: 'thresholdValue', label: 'Limit', align: 'right' },
  { key: 'windowMinutes', label: 'Time window', align: 'right' },
];

export default function ThresholdsTable({ thresholds }) {
  // Sortable rows need a plain field for "Applies to" — thresholds carry
  // either an agentName or the "default rule" case, so derive one column.
  const rows = useMemo(
    () => thresholds.map((row) => ({ ...row, appliesTo: row.agentId ? row.agentName : 'All projects (default)' })),
    [thresholds],
  );
  const { sorted, orderBy, direction, handleSort } = useSortableData(rows, { defaultOrderBy: 'appliesTo' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} align={col.align}>
                  <TableSortLabel active={orderBy === col.key} direction={orderBy === col.key ? direction : 'asc'} onClick={() => handleSort(col.key)}>
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{row.appliesTo}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{ALERT_TYPE_LABELS[row.alertType] || row.alertType}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'var(--g-mono)' }}>
                  {row.alertType === 'expensive_call' ? formatCurrency(row.thresholdValue) : formatPercent(row.thresholdValue, { precision: 0 })}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'var(--g-mono)', color: 'text.secondary' }}>{row.windowMinutes ? formatMinutes(row.windowMinutes) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, next) => setPage(next)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </>
  );
}
