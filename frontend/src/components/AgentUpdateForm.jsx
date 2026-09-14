import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { STATUS_VALUES } from '../constants';
import { useRecordUpdate } from '../hooks/useRecordUpdate';
import { FIELD_LABELS } from '../labels';
import ProgressSlider from './ProgressSlider';
import { useToast } from './ToastProvider';

export default function AgentUpdateForm({ agent }) {
  const recordUpdate = useRecordUpdate();
  const showToast = useToast();
  const [status, setStatus] = useState(agent.currentStatus);
  const [progress, setProgress] = useState(agent.currentProgress);
  const [statusDescription, setStatusDescription] = useState(agent.currentStatusDescription || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await recordUpdate.mutateAsync({
        agentId: agent.id,
        status,
        progress: Number(progress),
        statusDescription,
      });
      showToast('Update saved.', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to save update. Please try again.', 'error');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Log Today&apos;s Update
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField select label="Status" fullWidth value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_VALUES.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <div>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Progress
            </Typography>
            <ProgressSlider value={progress} onChange={setProgress} />
          </div>

          <TextField
            label={FIELD_LABELS.statusDescription}
            helperText="What's happening, in plain language"
            fullWidth
            multiline
            minRows={2}
            value={statusDescription}
            onChange={(e) => setStatusDescription(e.target.value)}
          />

          <Box>
            <Button type="submit" variant="contained" disabled={recordUpdate.isPending}>
              {recordUpdate.isPending ? 'Saving…' : 'Save Update'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}
