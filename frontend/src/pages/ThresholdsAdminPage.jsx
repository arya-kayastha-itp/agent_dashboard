import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ThresholdForm from '../components/ThresholdForm';
import ThresholdsTable from '../components/ThresholdsTable';
import { useThresholds } from '../hooks/useThresholds';

export default function ThresholdsAdminPage() {
  const { data: thresholds, isLoading, isError } = useThresholds();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Alert Rules
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Set the limits that decide when a cost or reliability alert fires — for one project, or as a
        default that applies to all of them.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add / update a rule
        </Typography>
        <ThresholdForm />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Current rules
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading rules…</Typography>
          </Stack>
        )}
        {isError && <Alert severity="error">Failed to load alert rules.</Alert>}
        {thresholds && thresholds.length === 0 && (
          <Alert severity="info">No custom rules yet — sensible default limits are being used instead.</Alert>
        )}
        {thresholds && thresholds.length > 0 && <ThresholdsTable thresholds={thresholds} />}
      </Paper>
    </Box>
  );
}
