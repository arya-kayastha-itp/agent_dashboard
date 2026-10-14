import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import AccentMark from '../components/AccentMark';
import ErrorAlert from '../components/ErrorAlert';
import ReviewCard from '../components/ReviewCard';
import { useToast } from '../components/ToastProvider';
import { usePageTitle } from '../hooks/usePageTitle';
import { useApproveSubmissions, useSubmissions } from '../hooks/useSubmissions';

// The Agent Manager's queue of updates sent by assignees, oldest first.
// Nothing here has touched the dashboard yet — approving is what applies it.
export default function ReviewInboxPage() {
  usePageTitle('Review');
  const { data: pending, isLoading, isError, refetch } = useSubmissions({ status: 'pending' });
  const approveSubmissions = useApproveSubmissions();
  const showToast = useToast();
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Selections for updates that have since been reviewed simply drop out.
  const selected = useMemo(() => new Set((pending || []).filter((s) => selectedIds.has(s.id)).map((s) => s.id)), [pending, selectedIds]);
  const pendingByAgent = useMemo(() => {
    const counts = new Map();
    (pending || []).forEach((s) => counts.set(s.agentId, (counts.get(s.agentId) || 0) + 1));
    return counts;
  }, [pending]);

  const allSelected = Boolean(pending?.length) && selected.size === pending.length;
  const toggle = (id, checked) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleBulkApprove = async () => {
    try {
      const { approvedCount } = await approveSubmissions.mutateAsync([...selected]);
      setSelectedIds(new Set());
      showToast(`Approved ${approvedCount} update${approvedCount === 1 ? '' : 's'}.`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to approve. Please try again.', 'error');
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
        sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}
      >
        <Box>
          <AccentMark />
          <Typography variant="h4">Review</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500, maxWidth: 720 }}>
            Updates sent by assignees. The dashboard only changes when you approve — you can edit before approving, ask for
            changes, or not accept with a comment.
          </Typography>
        </Box>
        {pending?.length > 0 && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControlLabel
              label="Select all"
              control={
                <Checkbox
                  checked={allSelected}
                  indeterminate={selected.size > 0 && !allSelected}
                  onChange={(event) => setSelectedIds(event.target.checked ? new Set(pending.map((s) => s.id)) : new Set())}
                />
              }
            />
            <Button variant="contained" disabled={selected.size === 0 || approveSubmissions.isPending} onClick={handleBulkApprove}>
              {approveSubmissions.isPending ? 'Approving…' : `Approve selected (${selected.size})`}
            </Button>
          </Stack>
        )}
      </Stack>

      {isLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading updates…</Typography>
        </Stack>
      )}
      {isError && <ErrorAlert onRetry={refetch}>Failed to load updates to review.</ErrorAlert>}
      {pending?.length === 0 && <Alert severity="success">All caught up — nothing is waiting for review.</Alert>}

      <Stack spacing={2}>
        {pending?.map((submission, index) => (
          <Box key={submission.id} sx={{ animation: 'g-rise 0.6s var(--g-ease) backwards', animationDelay: `${Math.min(index, 8) * 60 + 150}ms` }}>
            <ReviewCard
              submission={submission}
              selected={selected.has(submission.id)}
              onSelectedChange={(checked) => toggle(submission.id, checked)}
              othersForAgent={pendingByAgent.get(submission.agentId) - 1}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
