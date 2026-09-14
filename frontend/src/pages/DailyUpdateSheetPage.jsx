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
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import DailySheetRow from '../components/DailySheetRow';
import ErrorAlert from '../components/ErrorAlert';
import { useToast } from '../components/ToastProvider';
import UpdateHistoryList from '../components/UpdateHistoryList';
import { useAllUpdatesHistory, useTodayUpdates, useSubmitDailyUpdates } from '../hooks/useDailySheet';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSortableData } from '../hooks/useSortableData';
import { FIELD_LABELS } from '../labels';

export default function DailyUpdateSheetPage() {
  usePageTitle('Daily Update Sheet');
  const { data: rows, isLoading, isError, refetch } = useTodayUpdates();
  const { data: allHistory, isLoading: isHistoryLoading, isError: isHistoryError, refetch: refetchHistory } = useAllUpdatesHistory();
  const submitUpdates = useSubmitDailyUpdates();
  const showToast = useToast();
  const [entries, setEntries] = useState({});

  // Only "Agent" is sortable — Status/Progress/Notes are live-editable per
  // row, and sorting by an in-progress edit would reorder the table under
  // the user's cursor as they type.
  const sortableRows = useMemo(() => (rows || []).map((r) => ({ ...r, agentName: r.agent.name })), [rows]);
  const { sorted: sortedRows, orderBy, direction, handleSort } = useSortableData(sortableRows, { defaultOrderBy: 'agentName' });

  const carriedOverCount = useMemo(() => Object.values(entries).filter((e) => e.carriedOver).length, [entries]);
  const totalCount = Object.keys(entries).length;

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
    const payload = {
      entries: Object.entries(entries).map(([agentId, value]) => ({
        agentId,
        status: value.status,
        progress: Number(value.progress),
        statusDescription: value.statusDescription,
      })),
    };
    try {
      await submitUpdates.mutateAsync(payload);
      showToast("Today's updates saved.", 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || "Failed to save today's updates. Please try again.", 'error');
    }
  };

  if (isLoading) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading today&apos;s sheet…</Typography>
      </Stack>
    );
  }
  if (isError) return <ErrorAlert onRetry={refetch}>Failed to load today&apos;s sheet.</ErrorAlert>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4">Daily Update Sheet</Typography>
        <Button variant="contained" onClick={handleSubmit} disabled={submitUpdates.isPending}>
          Submit Today&apos;s Update
        </Button>
      </Stack>

      {totalCount > 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {carriedOverCount === 0
            ? `All ${totalCount} projects have been updated today.`
            : `${totalCount - carriedOverCount} of ${totalCount} confirmed, ${carriedOverCount} carried over from before — please review and confirm.`}
        </Typography>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={orderBy === 'agentName'} direction={direction} onClick={() => handleSort('agentName')}>
                  Agent
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>{FIELD_LABELS.statusDescription}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map(({ agent }) =>
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

      {isHistoryLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading update history…</Typography>
        </Stack>
      )}
      {isHistoryError && <ErrorAlert onRetry={refetchHistory}>Failed to load update history.</ErrorAlert>}
      {allHistory && allHistory.length === 0 && <Alert severity="info">No updates recorded yet.</Alert>}
      {allHistory && allHistory.length > 0 && <UpdateHistoryList history={allHistory} />}
    </Box>
  );
}
