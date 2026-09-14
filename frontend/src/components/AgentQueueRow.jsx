import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { computeAgentHealth } from '../agentHealth';
import { STATUS_VALUES } from '../constants';
import { HEALTH_LEVEL_META } from '../healthLevel';
import { useRecordUpdate } from '../hooks/useRecordUpdate';
import { FIELD_LABELS } from '../labels';
import ProgressBar from './ProgressBar';
import ProgressSlider from './ProgressSlider';
import StatusBadge from './StatusBadge';
import { useToast } from './ToastProvider';

// One row in the Agent Manager's action queue — the health caption makes the
// sort order legible, and "Update" expands an inline form so a single-agent
// change never has to go through the full Daily Sheet.
export default function AgentQueueRow({ agent }) {
  const navigate = useNavigate();
  const recordUpdate = useRecordUpdate();
  const showToast = useToast();
  const health = computeAgentHealth(agent);
  const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];

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
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <HealthIcon fontSize="small" color={healthColor} sx={{ flexShrink: 0 }} />

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="subtitle1"
              onClick={() => navigate(`/agents/${agent.id}`)}
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {agent.name}
            </Typography>
            <StatusBadge status={agent.currentStatus} />
          </Stack>
          <Typography variant="caption" color={`${healthColor}.main`}>
            {health.reason}
          </Typography>
        </Box>

        <Box sx={{ width: 180, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <ProgressBar progress={agent.currentProgress} />
        </Box>

        <Button
          size="small"
          variant="outlined"
          onClick={() => setExpanded((e) => !e)}
          endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />}
        >
          {expanded ? 'Close' : 'Update'}
        </Button>
      </Stack>

      <Collapse in={expanded}>
        <Box component="form" onSubmit={handleSave} sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
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
      </Collapse>
    </Box>
  );
}
