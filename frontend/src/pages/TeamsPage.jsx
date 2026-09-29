import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorAlert from '../components/ErrorAlert';
import TeamMembersTable from '../components/TeamMembersTable';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTeamMembers } from '../hooks/useTeamMembers';

export default function TeamsPage() {
  usePageTitle('Teams');
  const { data: members, isLoading, isError, refetch } = useTeamMembers();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Teams
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Agents can only be assigned to people on this list — use Add Member to add someone, then pick them when you add or edit
        an agent.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Team members{members ? ` (${members.length})` : ''}
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading team…</Typography>
          </Stack>
        )}
        {isError && <ErrorAlert onRetry={refetch}>Failed to load the team.</ErrorAlert>}
        {members && members.length === 0 && <Alert severity="info">No team members yet — add the first one above.</Alert>}
        {members && members.length > 0 && <TeamMembersTable members={members} />}
      </Paper>
    </Box>
  );
}
