import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { auditChangeLines, auditNotes, auditSentence } from '../auditText';
import { formatTimeAgo } from '../formatters';
import { PersonAvatar } from './AssigneeAvatars';

// One audit event: who did what to which agent, when, and the before → after
// values. The agent name links to its page while the agent still exists.
export default function AuditEventItem({ event, agentExists }) {
  const { before, after } = auditSentence(event);
  const lines = auditChangeLines(event.details?.changes);
  const notes = auditNotes(event);
  const agentLabel = event.agentName || 'an agent';

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1.5 }}>
      <PersonAvatar name={event.actorName || '?'} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={{ xs: 0.25, sm: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
            {before}
            {agentExists && event.agentId ? (
              <Link component={RouterLink} to={`/agents/${event.agentId}`} underline="hover" sx={{ fontWeight: 800 }}>
                {agentLabel}
              </Link>
            ) : (
              <Box component="span" sx={{ fontWeight: 800 }}>
                {agentLabel}
              </Box>
            )}
            {after}
          </Typography>
          <Tooltip title={format(new Date(event.occurredAt), 'PPpp')}>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
              {formatTimeAgo(event.occurredAt)}
            </Typography>
          </Tooltip>
        </Stack>

        {lines.length > 0 && (
          <Stack spacing={0.25} sx={{ mt: 0.75 }}>
            {lines.map((line) => (
              <Typography key={line.label} variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {line.label}:{' '}
                </Box>
                {line.text ?? (
                  <>
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {line.from}
                    </Box>
                    {' → '}
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {line.to}
                    </Box>
                  </>
                )}
              </Typography>
            ))}
          </Stack>
        )}

        {notes.map((note) => (
          <Typography key={note} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, wordBreak: 'break-word' }}>
            {note}
          </Typography>
        ))}
      </Box>
    </Stack>
  );
}
