import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { computeAgentHealth } from '../agentHealth';
import { STATUS_COLORS } from '../constants';
import { formatCurrency } from '../formatters';
import { HEALTH_LEVEL_META } from '../healthLevel';
import ProgressBar from './ProgressBar';

// The shared read-only row shape used by both the Executive's and the Agent
// Manager's agent lists — one <TableRow>'s worth of <TableCell>s, so status,
// assignee, cost, and progress each read as their own column instead of a
// wall of chips. `trailing` is where the Agent Manager's inline "Update"
// control slots in — Executive rows pass nothing and stay purely read-only.
// `leading` is where the drag handle for manual reordering slots in; when
// neither is passed, that column is omitted rather than left blank.
export default function AgentSummaryRow({ agent, onNameClick, insight, leading, trailing }) {
  const health = computeAgentHealth(agent);
  const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];
  const statusColor = STATUS_COLORS[agent.currentStatus];

  return (
    <>
      {leading !== undefined && <TableCell sx={{ width: 40, py: 0.75 }}>{leading}</TableCell>}
      <TableCell sx={{ width: 32, py: 0.75 }}>
        <HealthIcon fontSize="small" color={healthColor} sx={{ display: 'block' }} />
      </TableCell>

      <TableCell sx={{ py: 0.75 }}>
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
      </TableCell>

      <TableCell sx={{ py: 0.75, whiteSpace: 'nowrap' }}>
        <Typography
          variant="body2"
          color={statusColor && statusColor !== 'default' ? `${statusColor}.main` : 'text.secondary'}
          sx={{ fontWeight: 600 }}
        >
          {agent.currentStatus}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 0.75, display: { xs: 'none', sm: 'table-cell' } }}>
        <Typography variant="body2" color="text.secondary">
          {agent.assignedTo}
        </Typography>
      </TableCell>

      <TableCell sx={{ py: 0.75, display: { xs: 'none', lg: 'table-cell' } }}>
        {insight && insight.calls > 0 && (
          <>
            <Typography variant="body2">{formatCurrency(insight.cost)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {insight.calls} calls
            </Typography>
          </>
        )}
      </TableCell>

      <TableCell sx={{ py: 0.75, width: 160, display: { xs: 'none', md: 'table-cell' } }}>
        <ProgressBar progress={agent.currentProgress} />
      </TableCell>

      {trailing !== undefined && (
        <TableCell align="right" sx={{ py: 0.75 }}>
          {trailing}
        </TableCell>
      )}
    </>
  );
}
