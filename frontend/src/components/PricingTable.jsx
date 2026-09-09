import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { format } from 'date-fns';
import { formatCurrency } from '../formatters';
import InfoTooltip from './InfoTooltip';

export default function PricingTable({ pricing }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>
            <Stack direction="row" spacing={0.25} alignItems="center">
              Model
              <InfoTooltip title="The specific AI model this price applies to, as named by its provider." />
            </Stack>
          </TableCell>
          <TableCell align="right">
            <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="flex-end">
              Cost per 1,000 calls (in)
              <InfoTooltip title="What it costs for every 1,000 units of text sent to the AI model." />
            </Stack>
          </TableCell>
          <TableCell align="right">
            <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="flex-end">
              Cost per 1,000 calls (out)
              <InfoTooltip title="What it costs for every 1,000 units of text the AI model sends back." />
            </Stack>
          </TableCell>
          <TableCell>Effective from</TableCell>
          <TableCell>Added by</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pricing.map((row) => (
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
  );
}
