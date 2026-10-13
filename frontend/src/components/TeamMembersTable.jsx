import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { PersonAvatar } from './AssigneeAvatars';
import MemberAccessActions, { AccessSummary } from './MemberAccess';
import RemoveTeamMemberButton from './RemoveTeamMemberButton';

// `accountsByMember` maps team member id → sign-in account (when they have one).
export default function TeamMembersTable({ members, accountsByMember, currentTeamMemberId }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Access</TableCell>
            <TableCell>Assigned agents</TableCell>
            <TableCell align="right" sx={{ width: 112 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => {
            const account = accountsByMember.get(member.id);
            const isSelf = member.id === currentTeamMemberId;
            return (
              <TableRow key={member.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap', py: 1.25 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <PersonAvatar name={member.name} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.84rem' }}>
                        {member.name}
                        {isSelf && (
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 600, ml: 0.75 }}>
                            (you)
                          </Typography>
                        )}
                      </Typography>
                      {account && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {account.email}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  <AccessSummary account={account} />
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  {member.agents.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      None
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {member.agents.map((agent) => (
                        <Chip
                          key={agent.id}
                          size="small"
                          variant="outlined"
                          label={agent.name}
                          component={RouterLink}
                          to={`/agents/${agent.id}`}
                          clickable
                          sx={{ height: 25, borderRadius: '8px', fontWeight: 700, color: 'text.primary' }}
                        />
                      ))}
                    </Stack>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    <MemberAccessActions member={member} account={account} isSelf={isSelf} />
                    {!isSelf && <RemoveTeamMemberButton member={member} hasAccount={Boolean(account)} />}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
