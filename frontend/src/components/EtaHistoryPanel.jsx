import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Fragment } from 'react';
import { formatDay, formatTimeAgo } from '../formatters';
import { useEtaHistory } from '../hooks/useAgentHistory';
import { FIELD_LABELS } from '../labels';

function shift(fromEta, toEta) {
  if (!fromEta || !toEta) return null;
  const days = differenceInCalendarDays(parseISO(toEta), parseISO(fromEta));
  if (days === 0) return null;
  return { days, label: `${days > 0 ? '+' : '−'}${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`, later: days > 0 };
}

// Every move of the agent's target date with who, when and why — shown only
// once the date has changed at least once.
export default function EtaHistoryPanel({ agentId }) {
  const { data: changes } = useEtaHistory(agentId);
  if (!changes?.length) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 3, animation: 'g-rise 0.7s var(--g-ease) 0.3s backwards' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {FIELD_LABELS.eta} history
      </Typography>
      {changes.map((change, index) => {
        const moved = shift(change.fromEta, change.toEta);
        return (
          <Fragment key={change.id}>
            {index > 0 && <Divider />}
            <Box sx={{ py: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={{ xs: 0.25, sm: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {change.fromEta ? formatDay(change.fromEta) : 'No date'} → {change.toEta ? formatDay(change.toEta) : 'No date'}
                  {moved && (
                    <Box component="span" sx={{ ml: 1, color: moved.later ? 'warning.main' : 'success.main', fontWeight: 800 }}>
                      {moved.label}
                    </Box>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {change.changedByName || 'Someone'} · {change.source === 'submission' ? 'approved update' : 'edited'} ·{' '}
                  {formatTimeAgo(change.changedAt)}
                </Typography>
              </Stack>
              {change.reason && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  “{change.reason}”
                </Typography>
              )}
            </Box>
          </Fragment>
        );
      })}
    </Paper>
  );
}
