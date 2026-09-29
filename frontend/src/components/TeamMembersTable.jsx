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
import RemoveTeamMemberButton from './RemoveTeamMemberButton';

export default function TeamMembersTable({ members }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Assigned agents</TableCell>
            <TableCell align="right" sx={{ width: 64 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{member.name}</TableCell>
              <TableCell>
                {member.agents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {member.agents.map((agent) => (
                      <Chip
                        key={agent.id}
                        size="small"
                        variant="outlined"
                        label={agent.name}
                        component={RouterLink}
                        to={`/agents/${agent.id}`}
                        clickable
                      />
                    ))}
                  </Stack>
                )}
              </TableCell>
              <TableCell align="right">
                <RemoveTeamMemberButton member={member} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
