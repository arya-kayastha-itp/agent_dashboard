import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { format } from 'date-fns';
import { useState } from 'react';
import { formatCurrency } from '../formatters';
import { useSortableData } from '../hooks/useSortableData';
import InfoTooltip from './InfoTooltip';

const COLUMNS = [
  { key: 'model', label: 'Model', tooltip: 'The specific AI model this price applies to, as named by its provider.' },
  { key: 'inputPricePer1kTokens', label: 'Cost per 1,000 calls (in)', align: 'right', tooltip: 'What it costs for every 1,000 units of text sent to the AI model.' },
  { key: 'outputPricePer1kTokens', label: 'Cost per 1,000 calls (out)', align: 'right', tooltip: 'What it costs for every 1,000 units of text the AI model sends back.' },
  { key: 'effectiveFrom', label: 'Effective from' },
  { key: 'createdBy', label: 'Added by' },
];

export default function PricingTable({ pricing }) {
  const { sorted, orderBy, direction, handleSort } = useSortableData(pricing, { defaultOrderBy: 'effectiveFrom', defaultDirection: 'desc' });
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
                  <Stack direction="row" spacing={0.25} alignItems="center" justifyContent={col.align === 'right' ? 'flex-end' : 'flex-start'}>
                    <TableSortLabel active={orderBy === col.key} direction={orderBy === col.key ? direction : 'asc'} onClick={() => handleSort(col.key)}>
                      {col.label}
                    </TableSortLabel>
                    {col.tooltip && <InfoTooltip title={col.tooltip} />}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.model}</TableCell>
                <TableCell align="right">{formatCurrency(row.inputPricePer1kTokens, { precision: 4 })}</TableCell>
                <TableCell align="right">{formatCurrency(row.outputPricePer1kTokens, { precision: 4 })}</TableCell>
                <TableCell>{format(new Date(row.effectiveFrom), 'PPp')}</TableCell>
                <TableCell>{row.createdBy || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={pricing.length}
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
