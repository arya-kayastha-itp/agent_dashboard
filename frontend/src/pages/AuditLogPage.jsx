import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { format, isToday, isYesterday } from 'date-fns';
import { Fragment, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AccentMark from '../components/AccentMark';
import AuditEventItem from '../components/AuditEventItem';
import ErrorAlert from '../components/ErrorAlert';
import { useAgents } from '../hooks/useAgents';
import { useAuditEvents } from '../hooks/useAudit';
import { usePageTitle } from '../hooks/usePageTitle';
import { useUsers } from '../hooks/useUsers';

const ALL = '';

function dayLabel(date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, PP');
}

// Every change to every agent, newest first: who did it, when, and what
// changed. Filters live in the URL (?agent=&person=) so the agent page can
// link straight to one agent's history.
export default function AuditLogPage() {
  usePageTitle('Audit log');
  const [searchParams, setSearchParams] = useSearchParams();
  const agentId = searchParams.get('agent') || ALL;
  const personId = searchParams.get('person') || ALL;

  const { data: agents } = useAgents();
  const { data: accounts } = useUsers();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuditEvents({
    agentId: agentId || undefined,
    personId: personId || undefined,
  });

  const existingAgentIds = useMemo(() => new Set((agents || []).map((agent) => agent.id)), [agents]);
  const events = useMemo(() => (data?.pages || []).flatMap((page) => page.events), [data]);

  // The chosen agent or person may not be in the lists yet (still loading) or
  // any more (deleted, removed) — the log's own entries still carry the name.
  const agentOptions = useMemo(() => {
    const options = [...(agents || [])].sort((a, b) => a.name.localeCompare(b.name));
    if (agentId && !options.some((agent) => agent.id === agentId)) {
      options.unshift({ id: agentId, name: events.find((event) => event.agentId === agentId)?.agentName || 'Selected agent' });
    }
    return options;
  }, [agents, agentId, events]);
  const personOptions = useMemo(() => {
    const options = (accounts || []).map((account) => ({ id: account.id, name: account.name }));
    if (personId && !options.some((person) => person.id === personId)) {
      const event = events.find((e) => e.actorId === personId || e.subjectUserId === personId);
      options.unshift({ id: personId, name: (event?.actorId === personId ? event.actorName : event?.subjectName) || 'Selected person' });
    }
    return options;
  }, [accounts, personId, events]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <Box>
      <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">Audit log</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500, maxWidth: 760 }}>
          Every change to an agent — who made it, when, and what it was. Updates, reviews and edits to agent details all appear
          here, and entries are kept even after an agent or person is removed.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5, maxWidth: 720 }}>
        <TextField
          select
          size="small"
          label="Agent"
          fullWidth
          value={agentId}
          onChange={(e) => setFilter('agent', e.target.value)}
          SelectProps={{ displayEmpty: true }}
          InputLabelProps={{ shrink: true }}
        >
          <MenuItem value={ALL}>All agents</MenuItem>
          {agentOptions.map((agent) => (
            <MenuItem key={agent.id} value={agent.id}>
              {agent.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Person"
          fullWidth
          value={personId}
          onChange={(e) => setFilter('person', e.target.value)}
          SelectProps={{ displayEmpty: true }}
          InputLabelProps={{ shrink: true }}
          helperText={personId ? 'Changes they made, and reviews of their updates' : ' '}
        >
          <MenuItem value={ALL}>Everyone</MenuItem>
          {personOptions.map((person) => (
            <MenuItem key={person.id} value={person.id}>
              {person.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading the log…</Typography>
        </Stack>
      )}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load the audit log.</ErrorAlert>}
      {!isLoading && !isError && events.length === 0 && (
        <Alert severity="info">Nothing recorded for these filters yet. The log covers changes made since it was switched on.</Alert>
      )}

      {events.length > 0 && (
        <Paper variant="outlined" sx={{ px: { xs: 2, md: 3 }, py: 1, animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}>
          {events.map((event, index) => {
            const day = dayLabel(new Date(event.occurredAt));
            const newDay = index === 0 || day !== dayLabel(new Date(events[index - 1].occurredAt));
            return (
              <Fragment key={event.id}>
                {newDay && (
                  <Typography
                    sx={{
                      pt: index === 0 ? 1.5 : 3,
                      pb: 0.5,
                      fontFamily: 'var(--g-mono)',
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'text.disabled',
                    }}
                  >
                    {day}
                  </Typography>
                )}
                {!newDay && <Divider />}
                <AuditEventItem event={event} agentExists={existingAgentIds.has(event.agentId)} />
              </Fragment>
            );
          })}
          {hasNextPage && (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Button variant="outlined" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading…' : 'Load older entries'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
