import CheckIcon from '@mui/icons-material/Check';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { needsBlockerDetails } from '../agentRules';
import AccentMark from '../components/AccentMark';
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
  const navigate = useNavigate();
  const [entries, setEntries] = useState({});
  const dirtyIds = useRef(new Set());

  // Only "Agent" is sortable — Status/Progress/Notes are live-editable per
  // row, and sorting by an in-progress edit would reorder the table under
  // the user's cursor as they type.
  const sortableRows = useMemo(() => (rows || []).map((r) => ({ ...r, agentName: r.agent.name })), [rows]);
  const { sorted: sortedRows, orderBy, direction, handleSort } = useSortableData(sortableRows, { defaultOrderBy: 'agentName' });

  const carriedOverCount = useMemo(() => Object.values(entries).filter((e) => e.carriedOver).length, [entries]);
  const totalCount = Object.keys(entries).length;

  // Seeds the form from the server, and re-seeds whenever fresh rows arrive
  // (window-focus refetch, another tab's save) — but never for a row the user
  // has already edited, or a background refetch would silently revert their
  // unsaved changes to the old server values.
  useEffect(() => {
    if (!rows) return;
    setEntries((prev) => {
      const next = {};
      rows.forEach(({ agent, todayUpdate }) => {
        next[agent.id] = dirtyIds.current.has(agent.id) && prev[agent.id]
          ? prev[agent.id]
          : {
              status: todayUpdate?.status ?? agent.currentStatus,
              progress: todayUpdate?.progress ?? agent.currentProgress,
              statusDescription: todayUpdate?.statusDescription ?? agent.currentStatusDescription ?? '',
              blockerReason: agent.blockerReason ?? '',
              blockedBy: agent.blockedBy ?? '',
              carriedOver: !todayUpdate,
            };
      });
      return next;
    });
  }, [rows]);

  const handleRowChange = (agentId, patch) => {
    dirtyIds.current.add(agentId);
    setEntries((prev) => ({ ...prev, [agentId]: { ...prev[agentId], ...patch } }));
  };

  const handleSubmit = async () => {
    // Every agent newly marked Blocked needs its blocker details first.
    const agentsById = new Map((rows || []).map(({ agent }) => [agent.id, agent]));
    const missing = Object.entries(entries)
      .filter(([agentId, value]) => needsBlockerDetails(agentsById.get(agentId)?.currentStatus, value.status, value.blockerReason, value.blockedBy))
      .map(([agentId]) => agentsById.get(agentId)?.name);
    if (missing.length) {
      showToast(`Say why it's blocked and who or what can unblock it for: ${missing.join(', ')}.`, 'error');
      return;
    }

    const payload = {
      entries: Object.entries(entries).map(([agentId, value]) => ({
        agentId,
        status: value.status,
        progress: Number(value.progress),
        statusDescription: value.statusDescription,
        ...(value.status === 'Blocked' ? { blockerReason: value.blockerReason, blockedBy: value.blockedBy } : {}),
      })),
    };
    try {
      await submitUpdates.mutateAsync(payload);
      showToast("Today's updates saved.", 'success');
      navigate('/');
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
        sx={{ mb: 2.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}
      >
        <Box>
          <AccentMark />
          <Typography variant="h4">Daily Update Sheet</Typography>
        </Box>
        <Button variant="contained" startIcon={<CheckIcon />} onClick={handleSubmit} disabled={submitUpdates.isPending}>
          Submit Today&apos;s Update
        </Button>
      </Stack>

      {totalCount > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.25, sm: 2.25 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mb: 3, animation: 'g-rise 0.6s var(--g-ease) 0.1s backwards' }}
        >
          <Box
            aria-hidden="true"
            sx={{ display: 'flex', gap: totalCount > 30 ? '2px' : '4px', width: 200, flexShrink: 0 }}
          >
            {Array.from({ length: totalCount }, (_, i) => (
              <Box
                key={i}
                sx={{ flex: 1, height: 6, borderRadius: '3px', bgcolor: i < totalCount - carriedOverCount ? 'primary.main' : 'var(--g-track)' }}
              />
            ))}
          </Box>
          <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
            {carriedOverCount === 0 ? (
              `All ${totalCount} projects have been updated today.`
            ) : (
              <>
                <Box component="b" sx={{ color: 'text.primary', fontWeight: 800 }}>
                  {`${totalCount - carriedOverCount} of ${totalCount} confirmed`}
                </Box>
                {', '}
                <Box component="span" sx={{ color: 'warning.main', fontWeight: 800 }}>
                  {`${carriedOverCount} carried over`}
                </Box>
                {' from before — please review and confirm.'}
              </>
            )}
          </Typography>
        </Stack>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {/* Width hints keep Notes — the column people actually type in — the widest. */}
              <TableCell sx={{ width: '22%' }}>
                <TableSortLabel active={orderBy === 'agentName'} direction={direction} onClick={() => handleSort('agentName')}>
                  Agent
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: '17%' }}>Status</TableCell>
              <TableCell sx={{ width: '22%' }}>Progress</TableCell>
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
                  onChange={(patch) => handleRowChange(agent.id, patch)}
                />
              ) : null
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper variant="outlined" sx={{ mt: 4, p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.25s backwards' }}>
        <Typography variant="h5" sx={{ mb: 2.5 }}>
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
      </Paper>
    </Box>
  );
}
