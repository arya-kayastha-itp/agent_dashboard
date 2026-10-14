import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Fragment } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuditEvents } from '../hooks/useAudit';
import AuditEventItem from './AuditEventItem';
import ErrorAlert from './ErrorAlert';

const RECENT = 6;

// The agent page's slice of the audit log (Agent Manager only): the latest
// few changes, with the full filtered log one click away.
export default function AgentActivityPanel({ agentId }) {
  const { data, isLoading, isError, refetch } = useAuditEvents({ agentId, limit: RECENT });
  const events = data?.pages[0]?.events || [];

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 3, animation: 'g-rise 0.7s var(--g-ease) 0.35s backwards' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="h6">Activity</Typography>
        <Button component={RouterLink} to={`/audit?agent=${agentId}`} size="small">
          Open audit log →
        </Button>
      </Stack>

      {isLoading && <CircularProgress size={22} />}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load activity.</ErrorAlert>}
      {!isLoading && !isError && events.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No changes recorded yet.
        </Typography>
      )}
      <Box>
        {events.map((event, index) => (
          <Fragment key={event.id}>
            {index > 0 && <Divider />}
            {/* Already on this agent's page, so its name isn't a link here. */}
            <AuditEventItem event={event} agentExists={false} />
          </Fragment>
        ))}
      </Box>
    </Paper>
  );
}
