import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { STATUS_VALUES } from '../constants';
import { useRecordUpdate } from '../hooks/useRecordUpdate';

export default function AgentUpdateForm({ agent }) {
  const recordUpdate = useRecordUpdate();
  const [status, setStatus] = useState(agent.currentStatus);
  const [progress, setProgress] = useState(agent.currentProgress);
  const [statusDescription, setStatusDescription] = useState(agent.currentStatusDescription || '');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    await recordUpdate.mutateAsync({
      agentId: agent.id,
      status,
      progress: Number(progress),
      statusDescription,
    });
    setSaved(true);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Log Today&apos;s Update
      </Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Update saved.</Alert>}

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
            <Slider
              value={progress}
              onChange={(_, value) => setProgress(value)}
              valueLabelDisplay="auto"
              step={5}
              min={0}
              max={100}
            />
          </div>

          <TextField
            label="Status Description"
            fullWidth
            multiline
            minRows={2}
            value={statusDescription}
            onChange={(e) => setStatusDescription(e.target.value)}
          />

          <Box>
            <Button type="submit" variant="contained" disabled={recordUpdate.isPending}>
              Save Update
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}
