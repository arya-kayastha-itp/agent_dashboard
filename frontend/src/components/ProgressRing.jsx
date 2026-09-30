import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const RADIUS = 52;

// Circular counterpart to ProgressBar, used where there's room for one big
// number. `pathLength` normalises the circle to 100 so the dash offset is
// simply 100 − progress.
export default function ProgressRing({ progress, size = 136 }) {
  const value = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <Box
      role="progressbar"
      aria-label="Progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <Box component="svg" viewBox="0 0 120 120" sx={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--g-track)" strokeWidth="11" />
        <Box
          component="circle"
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          pathLength="100"
          sx={{
            stroke: 'var(--g-accent)',
            strokeDasharray: 100,
            strokeDashoffset: 100 - value,
            filter: 'drop-shadow(0 0 10px rgba(255, 138, 61, 0.4))',
            transition: 'stroke-dashoffset 0.6s var(--g-ease)',
            animation: 'g-ring 1.6s var(--g-ease) 0.2s both',
          }}
        />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
        <Typography sx={{ fontFamily: 'var(--g-display)', fontWeight: 600, fontSize: size * 0.21, lineHeight: 1, letterSpacing: '-0.04em' }}>
          {`${value}%`}
        </Typography>
        <Typography sx={{ fontFamily: 'var(--g-mono)', fontSize: '0.56rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Progress
        </Typography>
      </Box>
    </Box>
  );
}
