import Box from '@mui/material/Box';
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
      {groups.map((group, groupIndex) => (
        <Box
          key={group.agentId}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
            gap: { xs: 1, md: 3.5 },
            py: 2.5,
            borderTop: groupIndex === 0 ? 0 : 1,
            borderColor: 'divider',
            ...(groupIndex === 0 ? { pt: 0.5 } : {}),
          }}
        >
          <Typography variant="subtitle1" fontWeight={800} sx={{ pt: { md: 1 } }}>
            {group.agentName}
          </Typography>
          {/* A faint rail links each update's status dot into a timeline. */}
          <Box
            sx={{
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 17,
                top: 18,
                bottom: 18,
                width: '1px',
                background: 'linear-gradient(180deg, var(--g-line-2), transparent)',
              },
            }}
          >
            <Stack spacing={0.25}>
              {group.updates.map((update) => (
                <UpdateStoryRow key={update.id} update={update} />
              ))}
            </Stack>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
