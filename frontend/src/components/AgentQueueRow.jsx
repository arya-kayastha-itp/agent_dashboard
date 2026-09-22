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
import { STATUS_VALUES } from '../constants';
import { useRecordUpdate } from '../hooks/useRecordUpdate';
import { FIELD_LABELS } from '../labels';
import AgentSummaryRow from './AgentSummaryRow';
import ProgressSlider from './ProgressSlider';
import { useToast } from './ToastProvider';

export const AGENT_QUEUE_COLUMN_COUNT = 8;

// One row in the Agent Manager's action queue. Shares its read-only shape
// (icon, name, health caption, status, assignee, progress bar) with the
// Executive's rows via AgentSummaryRow, and adds "Update" to expand a
// second, full-width row with an inline form so a single-agent change never
// has to go through the full Daily Sheet.
export default function AgentQueueRow({ agent, insight, dragHandle, rowRef, rowStyle }) {
  const navigate = useNavigate();
  const recordUpdate = useRecordUpdate();
  const showToast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(agent.currentStatus);
  const [progress, setProgress] = useState(agent.currentProgress);
  const [statusDescription, setStatusDescription] = useState(agent.currentStatusDescription || '');

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      await recordUpdate.mutateAsync({
        agentId: agent.id,
        status,
        progress: Number(progress),
        statusDescription,
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
    setExpanded(false);
  };

  return (
    <>
      <TableRow ref={rowRef} style={rowStyle} hover sx={{ '& > td': { borderBottom: expanded ? 'none' : undefined } }}>
        <AgentSummaryRow
          agent={agent}
          insight={insight}
          leading={dragHandle}
          onNameClick={() => navigate(`/agents/${agent.id}`)}
          trailing={
            <Button
              size="small"
              variant="outlined"
              onClick={() => setExpanded((e) => !e)}
              endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
            >
              {expanded ? 'Close' : 'Update'}
            </Button>
          }
        />
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={AGENT_QUEUE_COLUMN_COUNT} sx={{ pt: 0, pb: 2, bgcolor: 'background.default' }}>
            <Box component="form" onSubmit={handleSave} sx={{ pt: 1 }}>
              <Stack spacing={2}>
                <TextField select label="Status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ maxWidth: 240 }}>
                  {STATUS_VALUES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>

                <div>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Progress
                  </Typography>
                  <ProgressSlider value={progress} onChange={setProgress} size="small" />
                </div>

                <TextField
                  label={FIELD_LABELS.statusDescription}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={statusDescription}
                  onChange={(e) => setStatusDescription(e.target.value)}
                />

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={handleCancel} disabled={recordUpdate.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" size="small" variant="contained" disabled={recordUpdate.isPending}>
                    {recordUpdate.isPending ? 'Saving…' : 'Save update'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
