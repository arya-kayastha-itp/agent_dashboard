import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

export default function ProgressBar({ progress }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flexGrow: 1 }}>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      <Typography variant="body2" color="text.secondary">{`${progress}%`}</Typography>
    </Box>
  );
}
