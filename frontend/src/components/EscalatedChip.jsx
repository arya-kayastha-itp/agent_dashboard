import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { daysBlocked } from '../agentHealth';

// Marks an agent that's been Blocked long enough to be escalated (the Agent
// Manager has been emailed about it).
export default function EscalatedChip({ agent, sx }) {
  if (!agent.blockerEscalated) return null;
  const days = daysBlocked(agent);
  return (
    <Tooltip title={`Blocked for ${days} days — escalated to the Agent Manager.${agent.blockedBy ? ` Waiting on ${agent.blockedBy}.` : ''}`}>
      <Chip
        size="small"
        color="error"
        icon={<PriorityHighIcon sx={{ fontSize: '13px !important' }} />}
        label="Escalated"
        sx={{ height: 22, fontWeight: 800, width: 'fit-content', ...sx }}
      />
    </Tooltip>
  );
}
