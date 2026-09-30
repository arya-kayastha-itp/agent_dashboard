import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import logo from '../assets/ai-garage-logo.png';

// Brand mark — the AI Garage lockup (icon + wordmark baked into one image,
// on its native black tile) paired with the "AI Garage Agents Dashboard"
// wordmark wherever the product identifies itself: "AI Garage" as a small
// eyebrow, "Agents Dashboard" in the display face beneath it.
export default function AiGarageLogo({ size = 38, withWordmark = true, fitWidth = false }) {
  const mark = (
    <Box
      component="img"
      src={logo}
      alt="AI Garage"
      sx={
        fitWidth
          ? {
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: `${Math.round(size * 0.2)}px`,
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.08)',
            }
          : {
              height: size,
              width: 'auto',
              display: 'block',
              borderRadius: `${Math.round(size * 0.2)}px`,
              flexShrink: 0,
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 10px 26px -12px rgba(255, 138, 61, 0.45)',
            }
      }
    />
  );

  if (!withWordmark) return mark;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
      {mark}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontFamily: 'var(--g-mono)',
            fontWeight: 600,
            fontSize: `${Math.max(9, Math.round(size * 0.28))}px`,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            lineHeight: 1.2,
          }}
        >
          AI Garage
        </Typography>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontFamily: 'var(--g-display)',
            fontWeight: 600,
            fontSize: `${Math.round(size * 0.4)}px`,
            letterSpacing: '-0.005em',
            lineHeight: 1.25,
            mt: 0.25,
          }}
        >
          Agents Dashboard
        </Typography>
      </Box>
    </Stack>
  );
}
