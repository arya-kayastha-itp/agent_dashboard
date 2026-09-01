import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';

export default function UpdateHistoryList({ history }) {
  const groups = [];
  const indexByAgent = new Map();
  history.forEach((row) => {
    if (!indexByAgent.has(row.agentId)) {
      indexByAgent.set(row.agentId, groups.length);
      groups.push({ agentId: row.agentId, agentName: row.agentName, updates: [] });
    }
    groups[indexByAgent.get(row.agentId)].updates.push(row);
  });

  return (
    <Box>
      {groups.map((group) => (
        <Box key={group.agentId} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {group.agentName}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.updates.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell>{format(new Date(update.updateDate), 'PP')}</TableCell>
                    <TableCell>
                      <StatusBadge status={update.status} />
                    </TableCell>
                    <TableCell>{update.progress}%</TableCell>
                    <TableCell>{update.statusDescription}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}
