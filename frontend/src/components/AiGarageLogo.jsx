import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import logo from '../assets/ai-garage-logo.png';

// Brand mark — the AI Garage lockup (icon + wordmark baked into one image,
// on its native black tile) paired with the "AI Garage Agents Dashboard"
// wordmark wherever the product identifies itself.
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
              borderRadius: `${Math.round(size * 0.16)}px`,
            }
          : {
              height: size,
              width: 'auto',
              display: 'block',
              borderRadius: `${Math.round(size * 0.16)}px`,
              flexShrink: 0,
            }
      }
    />
  );

  if (!withWordmark) return mark;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {mark}
      <Typography sx={{ fontWeight: 700, letterSpacing: '-0.01em', fontSize: `${Math.round(size * 0.4)}px` }}>
        AI Garage Agents Dashboard
      </Typography>
    </Stack>
  );
}
