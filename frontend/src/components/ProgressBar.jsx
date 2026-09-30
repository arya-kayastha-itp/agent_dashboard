import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

export default function ProgressBar({ progress }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flexGrow: 1 }}>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 34, textAlign: 'right', fontFamily: 'var(--g-mono)', fontWeight: 600, fontSize: '0.72rem' }}
      >{`${progress}%`}</Typography>
    </Box>
  );
}
