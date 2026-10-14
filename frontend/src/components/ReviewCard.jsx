import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { STATUS_VALUES } from '../constants';
import { formatDay, formatTimeAgo, toDateInputValue } from '../formatters';
import { useReviewSubmission } from '../hooks/useSubmissions';
import { FIELD_LABELS } from '../labels';
import { openNativePicker } from '../nativePicker';
import ProgressSlider from './ProgressSlider';
import StatusBadge from './StatusBadge';
import { useToast } from './ToastProvider';

// What the submitter proposed, with "no change" to the target date resolved
// to the agent's current one — the starting point for the reviewer's edits.
function proposedValues(submission) {
  return {
    status: submission.status,
    progress: submission.progress,
    statusDescription: submission.statusDescription || '',
    eta: submission.eta || toDateInputValue(submission.currentEta),
  };
}

const labelSx = {
  fontFamily: 'var(--g-mono)',
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'text.disabled',
};

// One field compared: what the dashboard shows now vs what's proposed.
function FieldRow({ label, current, proposed, changed }) {
  return (
    <Box sx={{ display: 'contents' }}>
      <Typography sx={{ ...labelSx, alignSelf: 'center' }}>{label}</Typography>
      <Box sx={{ minWidth: 0, color: 'text.secondary', fontSize: '0.84rem', alignSelf: 'center' }}>{current}</Box>
      <Box
        sx={(theme) => ({
          minWidth: 0,
          fontSize: '0.84rem',
          fontWeight: changed ? 700 : 500,
          alignSelf: 'center',
          px: 1,
          py: 0.5,
          mx: -1,
          borderRadius: '8px',
          bgcolor: changed ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
        })}
      >
        {proposed}
      </Box>
    </Box>
  );
}

export default function ReviewCard({ submission, selected, onSelectedChange, othersForAgent }) {
  const reviewSubmission = useReviewSubmission();
  const showToast = useToast();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => proposedValues(submission));
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState(false);
  const set = (field) => (value) => setValues((prev) => ({ ...prev, [field]: value }));

  const proposed = proposedValues(submission);
  // Only what the reviewer actually changed; a cleared date counts as no change.
  const edits = {};
  if (values.status !== proposed.status) edits.status = values.status;
  if (Number(values.progress) !== proposed.progress) edits.progress = Number(values.progress);
  if (values.statusDescription !== proposed.statusDescription) edits.statusDescription = values.statusDescription;
  if (values.eta && values.eta !== proposed.eta) edits.eta = values.eta;
  const edited = Object.keys(edits).length > 0;
  const firstName = submission.submitterName.split(' ')[0];

  const decide = async (decision) => {
    if (decision !== 'approve' && !comment.trim()) {
      setCommentError(true);
      return;
    }
    try {
      await reviewSubmission.mutateAsync({
        id: submission.id,
        decision,
        comment: comment.trim() || null,
        ...(decision === 'approve' && edited ? { edits } : {}),
      });
      const done = { approve: edited ? 'Approved with your edits.' : 'Approved.', request_changes: `Sent back to ${firstName}.`, reject: 'Not accepted.' };
      showToast(`${submission.agentName}: ${done[decision]}`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to save your review. Please try again.', 'error');
    }
  };

  const current = {
    status: <StatusBadge status={submission.currentStatus} />,
    progress: `${submission.currentProgress}%`,
    notes: submission.currentStatusDescription || '—',
    eta: submission.currentEta ? formatDay(submission.currentEta) : '—',
  };
  const etaChanged = values.eta !== toDateInputValue(submission.currentEta);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderColor: selected ? 'primary.main' : undefined }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Checkbox
          checked={selected}
          onChange={(event) => onSelectedChange(event.target.checked)}
          inputProps={{ 'aria-label': `Select ${submission.agentName} for bulk approval` }}
          disabled={edited}
          sx={{ mt: -0.75, ml: -1 }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
            <Link component={RouterLink} to={`/agents/${submission.agentId}`} underline="hover" color="text.primary" sx={{ fontWeight: 800 }}>
              {submission.agentName}
            </Link>
            <Typography variant="caption" color="text.secondary">
              {submission.submitterName} · sent {formatTimeAgo(submission.submittedAt)}
            </Typography>
          </Stack>
          {othersForAgent > 0 && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'warning.main', fontWeight: 700 }}>
              {othersForAgent === 1 ? 'Another update' : `${othersForAgent} other updates`} for this agent{' '}
              {othersForAgent === 1 ? 'is' : 'are'} waiting — approving this one closes {othersForAgent === 1 ? 'it' : 'them'} if older.
            </Typography>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) minmax(0, 1fr)', columnGap: 2, rowGap: 1.25, mt: 2 }}>
            <span />
            <Typography sx={labelSx}>Now</Typography>
            <Typography sx={labelSx}>{editing ? 'Approve as' : 'Proposed'}</Typography>

            <FieldRow
              label="Status"
              current={current.status}
              changed={values.status !== submission.currentStatus}
              proposed={
                editing ? (
                  <TextField select size="small" fullWidth value={values.status} onChange={(e) => set('status')(e.target.value)}>
                    {STATUS_VALUES.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <StatusBadge status={values.status} />
                )
              }
            />
            <FieldRow
              label="Progress"
              current={current.progress}
              changed={Number(values.progress) !== submission.currentProgress}
              proposed={editing ? <ProgressSlider value={values.progress} onChange={set('progress')} size="small" /> : `${values.progress}%`}
            />
            <FieldRow
              label={FIELD_LABELS.statusDescription}
              current={current.notes}
              changed={values.statusDescription !== (submission.currentStatusDescription || '')}
              proposed={
                editing ? (
                  <TextField size="small" fullWidth multiline minRows={2} value={values.statusDescription} onChange={(e) => set('statusDescription')(e.target.value)} />
                ) : (
                  values.statusDescription || '—'
                )
              }
            />
            <FieldRow
              label={FIELD_LABELS.eta}
              current={current.eta}
              changed={etaChanged}
              proposed={
                editing ? (
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    inputProps={{ onClick: openNativePicker }}
                    value={values.eta}
                    onChange={(e) => set('eta')(e.target.value)}
                  />
                ) : etaChanged ? (
                  formatDay(values.eta)
                ) : (
                  'No change'
                )
              }
            />
          </Box>

          <TextField
            label={`Comment to ${firstName}`}
            placeholder="Required when asking for changes or not accepting"
            size="small"
            fullWidth
            multiline
            sx={{ mt: 2.5 }}
            value={comment}
            error={commentError}
            helperText={commentError ? 'Add a comment so they know what to change' : ' '}
            onChange={(e) => {
              setComment(e.target.value);
              setCommentError(false);
            }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Button
              size="small"
              startIcon={<EditOutlinedIcon />}
              onClick={() => {
                if (editing) setValues(proposed);
                setEditing((e) => !e);
              }}
              disabled={reviewSubmission.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {editing ? 'Discard edits' : 'Edit before approving'}
            </Button>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" color="error" onClick={() => decide('reject')} disabled={reviewSubmission.isPending}>
                Don&apos;t accept
              </Button>
              <Button size="small" variant="outlined" onClick={() => decide('request_changes')} disabled={reviewSubmission.isPending}>
                Ask for changes
              </Button>
              <Button size="small" variant="contained" onClick={() => decide('approve')} disabled={reviewSubmission.isPending}>
                {edited ? 'Approve with edits' : 'Approve'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
