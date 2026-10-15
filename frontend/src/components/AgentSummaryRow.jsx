import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { computeAgentHealth } from '../agentHealth';
import { formatAssignees } from '../formatters';
import { HEALTH_LEVEL_META } from '../healthLevel';
import AssigneeAvatars from './AssigneeAvatars';
import EscalatedChip from './EscalatedChip';
import MarketplaceTag from './MarketplaceTag';
import PendingReviewChip from './PendingReviewChip';
import ProgressBar from './ProgressBar';
import SlipBadge from './SlipBadge';
import StatusBadge from './StatusBadge';

const CELL_PY = 1.25;

// The shared read-only row shape used by both the Executive's and the Agent
// Manager's agent lists — one <TableRow>'s worth of <TableCell>s: name (with
// its health caption), assignee, progress, then status last. `trailing` is
// where the Agent Manager's inline "Update" control slots in — Executive
// rows pass nothing and stay purely read-only. `leading` is where the drag
// handle for manual reordering slots in; when neither is passed, that
// column is omitted rather than left blank.
export default function AgentSummaryRow({ agent, onNameClick, leading, trailing }) {
  const health = computeAgentHealth(agent);
  const { color: healthColor, Icon: HealthIcon } = HEALTH_LEVEL_META[health.level];
  const reasonColor = healthColor === 'default' ? 'text.secondary' : `${healthColor}.main`;

  return (
    <>
      {leading !== undefined && <TableCell sx={{ width: 40, py: CELL_PY, pr: 0 }}>{leading}</TableCell>}

      <TableCell sx={{ py: CELL_PY }}>
        <Typography
          variant="subtitle2"
          onClick={onNameClick}
          sx={{
            fontSize: '0.875rem',
            fontWeight: 800,
            ...(onNameClick
              ? {
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline', textDecorationColor: 'var(--g-accent)', textDecorationThickness: 2, textUnderlineOffset: 4 },
                }
              : {}),
          }}
        >
          {agent.name}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25, color: reasonColor }}>
          <HealthIcon sx={{ fontSize: 13 }} />
          <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700, fontSize: '0.75rem' }}>
            {health.reason}
          </Typography>
        </Stack>
        <MarketplaceTag agent={agent} sx={{ display: 'flex', width: 'fit-content', mt: 0.5 }} />
        <SlipBadge agent={agent} sx={{ mt: 0.5 }} />
      </TableCell>

      <TableCell sx={{ py: CELL_PY, display: { xs: 'none', sm: 'table-cell' } }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <AssigneeAvatars agent={agent} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {formatAssignees(agent)}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell sx={{ py: CELL_PY, width: 230, display: { xs: 'none', md: 'table-cell' } }}>
        <ProgressBar progress={agent.currentProgress} />
      </TableCell>

      <TableCell sx={{ py: CELL_PY, whiteSpace: 'nowrap' }}>
        <Stack spacing={0.75} alignItems="flex-start">
          <StatusBadge status={agent.currentStatus} />
          <EscalatedChip agent={agent} />
          <PendingReviewChip agent={agent} />
        </Stack>
      </TableCell>

      {trailing !== undefined && (
        <TableCell align="right" sx={{ py: CELL_PY }}>
          {trailing}
        </TableCell>
      )}
    </>
  );
}
