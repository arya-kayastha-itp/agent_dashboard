import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import DailySheetRow from '../components/DailySheetRow';
import UpdateHistoryList from '../components/UpdateHistoryList';
import { useAllUpdatesHistory, useTodayUpdates, useSubmitDailyUpdates } from '../hooks/useDailySheet';

export default function DailyUpdateSheetPage() {
  const { data: rows, isLoading, isError } = useTodayUpdates();
  const { data: allHistory, isLoading: isHistoryLoading } = useAllUpdatesHistory();
  const submitUpdates = useSubmitDailyUpdates();
  const [entries, setEntries] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!rows) return;
    const initial = {};
    rows.forEach(({ agent, todayUpdate }) => {
      initial[agent.id] = {
        status: todayUpdate?.status ?? agent.currentStatus,
        progress: todayUpdate?.progress ?? agent.currentProgress,
        statusDescription: todayUpdate?.statusDescription ?? agent.currentStatusDescription ?? '',
        carriedOver: !todayUpdate,
      };
    });
    setEntries(initial);
  }, [rows]);

  const handleSubmit = async () => {
    setSubmitted(false);
    const payload = {
      entries: Object.entries(entries).map(([agentId, value]) => ({
        agentId,
        status: value.status,
        progress: Number(value.progress),
        statusDescription: value.statusDescription,
      })),
    };
    await submitUpdates.mutateAsync(payload);
    setSubmitted(true);
  };

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to load today&apos;s sheet.</Alert>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Daily Update Sheet</Typography>
        <Button variant="contained" onClick={handleSubmit} disabled={submitUpdates.isPending}>
          Submit Today&apos;s Update
        </Button>
      </Stack>

      {submitted && <Alert severity="success" sx={{ mb: 2 }}>Today&apos;s updates saved.</Alert>}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Agent</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Status Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows?.map(({ agent }) =>
              entries[agent.id] ? (
                <DailySheetRow
                  key={agent.id}
                  agent={agent}
                  value={entries[agent.id]}
                  carriedOver={entries[agent.id].carriedOver}
                  onChange={(value) => setEntries((prev) => ({ ...prev, [agent.id]: value }))}
                />
              ) : null
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h5" sx={{ mt: 5, mb: 2 }}>
        Update History
      </Typography>

      {isHistoryLoading && <CircularProgress />}
      {allHistory && allHistory.length === 0 && <Alert severity="info">No updates recorded yet.</Alert>}
      {allHistory && allHistory.length > 0 && <UpdateHistoryList history={allHistory} />}
    </Box>
  );
}
