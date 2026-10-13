import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import AccentMark from '../components/AccentMark';
import ErrorAlert from '../components/ErrorAlert';
import TeamMembersTable from '../components/TeamMembersTable';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useUsers } from '../hooks/useUsers';
import { usePersona } from '../persona/PersonaContext';

export default function TeamsPage() {
  usePageTitle('Teams');
  const { user } = usePersona();
  const membersQuery = useTeamMembers();
  const usersQuery = useUsers();
  const members = membersQuery.data;

  const accountsByMember = useMemo(
    () => new Map((usersQuery.data || []).map((account) => [account.teamMemberId, account])),
    [usersQuery.data],
  );

  const isLoading = membersQuery.isLoading || usersQuery.isLoading;
  const isError = membersQuery.isError || usersQuery.isError;
  const retry = () => {
    membersQuery.refetch();
    usersQuery.refetch();
  };

  return (
    <Box>
      <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">Teams</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500, maxWidth: 760 }}>
          Agents can only be assigned to people on this list. Invite someone to give them their own sign-in — they&apos;ll get a
          link to set a password.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Team members{members ? ` (${members.length})` : ''}
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading team…</Typography>
          </Stack>
        )}
        {isError && <ErrorAlert onRetry={retry}>Failed to load the team.</ErrorAlert>}
        {!isLoading && !isError && members?.length === 0 && (
          <Alert severity="info">No team members yet — add the first one above.</Alert>
        )}
        {!isLoading && !isError && members?.length > 0 && (
          <TeamMembersTable members={members} accountsByMember={accountsByMember} currentTeamMemberId={user?.teamMemberId} />
        )}
      </Paper>
    </Box>
  );
}
