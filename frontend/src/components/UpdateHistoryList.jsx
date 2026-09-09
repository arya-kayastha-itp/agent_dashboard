import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import UpdateStoryRow from './UpdateStoryRow';

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
          <Paper variant="outlined">
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              {group.updates.map((update) => (
                <UpdateStoryRow key={update.id} update={update} />
              ))}
            </Stack>
          </Paper>
        </Box>
      ))}
    </Box>
  );
}
