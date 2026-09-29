import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { computeAgentHealth } from '../agentHealth';
import { STATUS_COLORS } from '../constants';
import { formatAssignees } from '../formatters';
import { HEALTH_LEVEL_META } from '../healthLevel';
import MarketplaceTag from './MarketplaceTag';
import ProgressBar from './ProgressBar';

// The shared read-only row shape used by both the Executive's and the Agent
// Manager's agent lists — one <TableRow>'s worth of <TableCell>s: name (with
// its health caption), assignee, progress, then status last. `trailing` is
// where the Agent Manager's inline "Update" control slots in — Executive
// rows pass nothing and stay purely read-only. `leading` is where the drag
// handle for manual reordering slots in; when neither is passed, that
// column is omitted rather than left blank.
export default function AgentSummaryRow({ agent, onNameClick, leading, trailing }) {
  const health = computeAgentHealth(agent);
  const { color: healthColor } = HEALTH_LEVEL_META[health.level];
  const statusColor = STATUS_COLORS[agent.currentStatus];

  return (
    <>
      {leading !== undefined && <TableCell sx={{ width: 40, py: 0.875 }}>{leading}</TableCell>}

      <TableCell sx={{ py: 0.875 }}>
        <Typography
          variant="subtitle2"
          onClick={onNameClick}
          sx={onNameClick ? { cursor: 'pointer', '&:hover': { textDecoration: 'underline' } } : undefined}
        >
          {agent.name}
        </Typography>
        <Typography variant="caption" color={`${healthColor}.main`}>
          {health.reason}
        </Typography>
        <MarketplaceTag agent={agent} sx={{ display: 'flex', width: 'fit-content', mt: 0.5 }} />
      </TableCell>

      <TableCell sx={{ py: 0.875, display: { xs: 'none', sm: 'table-cell' } }}>
        <Typography variant="body2" color="text.secondary">
          {formatAssignees(agent)}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 0.875, width: 260, display: { xs: 'none', md: 'table-cell' } }}>
        <ProgressBar progress={agent.currentProgress} />
      </TableCell>

      <TableCell sx={{ py: 0.875, whiteSpace: 'nowrap' }}>
        <Typography
          variant="body2"
          color={statusColor && statusColor !== 'default' ? `${statusColor}.main` : 'text.secondary'}
          sx={{ fontWeight: 600 }}
        >
          {agent.currentStatus}
        </Typography>
      </TableCell>

      {trailing !== undefined && (
        <TableCell align="right" sx={{ py: 0.875 }}>
          {trailing}
        </TableCell>
      )}
    </>
  );
}
