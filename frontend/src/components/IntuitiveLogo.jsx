import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// Brand mark — a navy tile with a four-point "sparkle" star, drawn inline so
// it scales cleanly instead of shipping a raster asset. Paired with the
// "Intuitive.AI" wordmark wherever the product identifies itself.
export default function IntuitiveLogo({ size = 34, withWordmark = true }) {
  const mark = (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.3)}px`,
        bgcolor: 'secondary.main',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={Math.round(size * 0.68)} height={Math.round(size * 0.68)} viewBox="0 0 24 24" fill="#fff">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    </Box>
  );

  if (!withWordmark) return mark;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {mark}
      <Typography sx={{ fontWeight: 700, letterSpacing: '-0.01em', fontSize: `${Math.round(size * 0.65)}px` }}>
        Intuitive.AI
      </Typography>
    </Stack>
  );
}
