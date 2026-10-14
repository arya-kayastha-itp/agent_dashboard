import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { STATUS_VALUES } from '../constants';
import { formatDay, formatTimeAgo, toDateInputValue } from '../formatters';
import { useCreateSubmission, useSubmissions } from '../hooks/useSubmissions';
import { FIELD_LABELS } from '../labels';
import { openNativePicker } from '../nativePicker';
import ProgressSlider from './ProgressSlider';
import { useToast } from './ToastProvider';

// What the reviewer changed before approving, in a few words.
function reviewerEdits(submission) {
  return [
    submission.approvedStatus !== submission.status && `status to ${submission.approvedStatus}`,
    submission.approvedProgress !== submission.progress && `progress to ${submission.approvedProgress}%`,
    (submission.approvedStatusDescription ?? '') !== (submission.statusDescription ?? '') && 'the notes',
    (submission.approvedEta ?? null) !== (submission.eta ?? null) && `the target date to ${formatDay(submission.approvedEta)}`,
  ].filter(Boolean);
}

function LastSubmission({ submission }) {
  if (!submission || submission.reviewStatus === 'superseded') return null;
  const reviewer = submission.reviewerName || 'The Agent Manager';
  const comment = submission.reviewComment ? ` “${submission.reviewComment}”` : '';

  if (submission.reviewStatus === 'pending') {
    return (
      <Alert severity="info">
        Your update from {formatTimeAgo(submission.submittedAt)} is waiting for review. Sending another one replaces it.
      </Alert>
    );
  }
  if (submission.reviewStatus === 'changes_requested') {
    return (
      <Alert severity="warning">
        {reviewer} asked for changes:{comment} Your update is below — edit it and send it again.
      </Alert>
    );
  }
  if (submission.reviewStatus === 'rejected') {
    return (
      <Alert severity="error">
        {reviewer} didn&apos;t accept your last update:{comment}
      </Alert>
    );
  }
  const edits = reviewerEdits(submission);
  return (
    <Alert severity="success">
      Your last update was approved {formatTimeAgo(submission.reviewedAt)}
      {edits.length > 0 ? `, with ${reviewer} changing ${edits.join(', ')}.` : '.'}
      {comment && ` Their note:${comment}`}
    </Alert>
  );
}

// Starts from the person's own waiting or sent-back update if there is one,
// otherwise from what the dashboard currently shows.
function startingValues(agent, latest) {
  const fromLatest = latest && ['pending', 'changes_requested'].includes(latest.reviewStatus);
  return {
    status: fromLatest ? latest.status : agent.currentStatus,
    progress: fromLatest ? latest.progress : agent.currentProgress,
    statusDescription: (fromLatest ? latest.statusDescription : agent.currentStatusDescription) || '',
    eta: fromLatest && latest.eta ? latest.eta : toDateInputValue(agent.eta),
  };
}

function SubmitForm({ agent, latest }) {
  const createSubmission = useCreateSubmission();
  const showToast = useToast();
  const [values, setValues] = useState(() => startingValues(agent, latest));
  const set = (field) => (value) => setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const currentEta = toDateInputValue(agent.eta);
    try {
      await createSubmission.mutateAsync({
        agentId: agent.id,
        status: values.status,
        progress: Number(values.progress),
        statusDescription: values.statusDescription,
        // Only a changed target date is a proposal; otherwise "no change".
        eta: values.eta && values.eta !== currentEta ? values.eta : null,
      });
      showToast('Sent to the Agent Manager for review.', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to send your update. Please try again.', 'error');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <LastSubmission submission={latest} />

        <Stack direction="row" spacing={2}>
          <TextField select label="Status" fullWidth value={values.status} onChange={(e) => set('status')(e.target.value)}>
            {STATUS_VALUES.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={FIELD_LABELS.eta}
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ onClick: openNativePicker }}
            value={values.eta}
            onChange={(e) => set('eta')(e.target.value)}
          />
        </Stack>

        <div>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.4, mb: 0.75 }}>
            Progress
          </Typography>
          <ProgressSlider value={values.progress} onChange={set('progress')} />
        </div>

        <TextField
          label={FIELD_LABELS.statusDescription}
          helperText="What's happening, in plain language"
          fullWidth
          multiline
          minRows={2}
          value={values.statusDescription}
          onChange={(e) => set('statusDescription')(e.target.value)}
        />

        <Box>
          <Button type="submit" variant="contained" disabled={createSubmission.isPending}>
            {createSubmission.isPending ? 'Sending…' : 'Send for review'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

// The assignee's version of "Log Today's Update": nothing changes on the
// dashboard until the Agent Manager approves it.
export default function SubmitUpdateForm({ agent }) {
  const { data: mine, isLoading } = useSubmissions({ agentId: agent.id });
  const latest = mine?.[0];

  return (
    <Paper variant="outlined" sx={{ p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.15s backwards' }}>
      <Typography variant="h6">Send an update</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
        The Agent Manager reviews it before the dashboard changes.
      </Typography>
      {isLoading ? (
        <CircularProgress size={22} />
      ) : (
        // Keyed by the latest submission so the form restarts from it once it changes.
        <SubmitForm key={latest ? `${latest.id}-${latest.reviewStatus}` : 'none'} agent={agent} latest={latest} />
      )}
    </Paper>
  );
}
