import Box from '@mui/material/Box';

// The short orange bar that sits above page titles — purely decorative.
export default function AccentMark({ sx }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 28,
        height: 3,
        borderRadius: '3px',
        bgcolor: 'primary.main',
        boxShadow: '0 0 14px rgba(255, 138, 61, 0.5)',
        mb: 1.75,
        ...sx,
      }}
    />
  );
}
