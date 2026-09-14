import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';
import { formatCurrency, formatPercent } from '../formatters';
import { useSortableData } from '../hooks/useSortableData';

const COLUMNS = [
  { key: 'name', label: 'Agent' },
  { key: 'calls', label: 'Calls', align: 'right' },
  { key: 'cost', label: 'Cost', align: 'right' },
  { key: 'errorRate', label: 'Error rate', align: 'right' },
];

// This is what closes the "which agent is expensive" gap — cost and error
// rate live next to each other, per agent, sortable, instead of requiring
// FinOps to cross-reference the alerts list against the cost chart by hand.
export default function AgentCostTable({ agents, insightsByAgent }) {
  const rows = agents
    .map((agent) => {
      const insight = insightsByAgent?.[agent.id];
      if (!insight || insight.calls === 0) return null;
      return { id: agent.id, name: agent.name, calls: insight.calls, cost: Number(insight.cost), errorRate: Number(insight.errorRate) };
    })
    .filter(Boolean);

  const { sorted, orderBy, direction, handleSort } = useSortableData(rows, { defaultOrderBy: 'cost', defaultDirection: 'desc' });

  return (
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
          {sorted.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link component={RouterLink} to={`/agents/${row.id}`} underline="hover" color="inherit">
                  {row.name}
                </Link>
              </TableCell>
              <TableCell align="right">{row.calls}</TableCell>
              <TableCell align="right">{formatCurrency(row.cost)}</TableCell>
              <TableCell
                align="right"
                sx={{ color: row.errorRate > 10 ? 'error.main' : row.errorRate > 5 ? 'warning.main' : 'text.primary', fontWeight: row.errorRate > 5 ? 700 : 400 }}
              >
                {formatPercent(row.errorRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
