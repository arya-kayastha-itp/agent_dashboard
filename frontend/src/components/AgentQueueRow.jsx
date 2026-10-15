import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { needsBlockerDetails } from '../agentRules';
import { STATUS_VALUES } from '../constants';
import { useRecordUpdate } from '../hooks/useRecordUpdate';
import { FIELD_LABELS } from '../labels';
import AgentSummaryRow from './AgentSummaryRow';
import BlockerFields from './BlockerFields';
import ProgressSlider from './ProgressSlider';
import { useToast } from './ToastProvider';

export const AGENT_QUEUE_COLUMN_COUNT = 6;

// One row in the Agent Manager's action queue. Shares its read-only shape
// (name, health caption, assignee, progress bar, status) with the
// Executive's rows via AgentSummaryRow, and adds "Update" to expand a
// second, full-width row with an inline form so a single-agent change never
// has to go through the full Daily Sheet.
export default function AgentQueueRow({ agent, dragHandle, rowRef, rowStyle }) {
  const navigate = useNavigate();
  const recordUpdate = useRecordUpdate();
  const showToast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(agent.currentStatus);
  const [progress, setProgress] = useState(agent.currentProgress);
  const [statusDescription, setStatusDescription] = useState(agent.currentStatusDescription || '');
  const [blocker, setBlocker] = useState({ blockerReason: agent.blockerReason || '', blockedBy: agent.blockedBy || '' });

  const handleSave = async (event) => {
    event.preventDefault();
    if (needsBlockerDetails(agent.currentStatus, status, blocker.blockerReason, blocker.blockedBy)) {
      showToast("Say why it's blocked and who or what can unblock it.", 'error');
      return;
    }
    try {
      await recordUpdate.mutateAsync({
        agentId: agent.id,
        status,
        progress: Number(progress),
        statusDescription,
        ...(status === 'Blocked' ? blocker : {}),
      });
      showToast('Update saved.', 'success');
      setExpanded(false);
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to save update. Please try again.', 'error');
    }
  };

  const handleCancel = () => {
    setStatus(agent.currentStatus);
    setProgress(agent.currentProgress);
    setStatusDescription(agent.currentStatusDescription || '');
    setBlocker({ blockerReason: agent.blockerReason || '', blockedBy: agent.blockedBy || '' });
    setExpanded(false);
  };

  return (
    <>
      <TableRow
        ref={rowRef}
        style={rowStyle}
        hover
        sx={{
          '& > td': { borderBottom: expanded ? 'none' : undefined },
          bgcolor: expanded ? 'var(--g-surface-2)' : undefined,
          // Opacity-only entrance: a transform animation would fight the
          // drag-and-drop transform dnd-kit sets on this row.
          animation: 'g-fade 0.5s ease 0.2s backwards',
        }}
      >
        <AgentSummaryRow
          agent={agent}
          leading={dragHandle}
          onNameClick={() => navigate(`/agents/${agent.id}`)}
          trailing={
            <Button
              size="small"
              variant="outlined"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s var(--g-ease)' }} />}
            >
              {expanded ? 'Close' : 'Update'}
            </Button>
          }
        />
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={AGENT_QUEUE_COLUMN_COUNT} sx={{ p: 0, bgcolor: 'var(--g-surface-2)' }}>
            <Box
              component="form"
              onSubmit={handleSave}
              sx={{
                px: { xs: 2, md: 3 },
                pl: { md: 9 },
                pt: 2.5,
                pb: 3,
                borderTop: '1px dashed var(--g-line-2)',
                animation: 'g-open 0.45s var(--g-ease) both',
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' }, gap: 2.5 }}>
                <TextField select label="Status" size="small" fullWidth value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_VALUES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>

                <div>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.4, mb: 0.75 }}
                  >
                    Progress
                  </Typography>
                  <ProgressSlider value={progress} onChange={setProgress} size="small" />
                </div>

                {status === 'Blocked' && (
                  <BlockerFields
                    size="small"
                    direction="row"
                    reason={blocker.blockerReason}
                    blockedBy={blocker.blockedBy}
                    required={agent.currentStatus !== 'Blocked'}
                    onChange={(patch) => setBlocker((prev) => ({ ...prev, ...patch }))}
                    sx={{ gridColumn: '1 / -1' }}
                  />
                )}

                <TextField
                  label={FIELD_LABELS.statusDescription}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={statusDescription}
                  onChange={(e) => setStatusDescription(e.target.value)}
                  sx={{ gridColumn: '1 / -1' }}
                />
              </Box>

              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button size="small" onClick={handleCancel} disabled={recordUpdate.isPending}>
                  Cancel
                </Button>
                <Button type="submit" size="small" variant="contained" disabled={recordUpdate.isPending}>
                  {recordUpdate.isPending ? 'Saving…' : 'Save update'}
                </Button>
              </Stack>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
