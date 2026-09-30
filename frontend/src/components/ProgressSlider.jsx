import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

// Slider + a numeric fallback for keyboard-precise entry — dragging isn't
// the only way to set an exact percentage.
export default function ProgressSlider({ value, onChange, size = 'medium' }) {
  const handleNumberChange = (event) => {
    if (event.target.value === '') return;
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    onChange(Math.min(100, Math.max(0, next)));
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Slider value={value} onChange={(_, v) => onChange(v)} valueLabelDisplay="auto" step={5} min={0} max={100} size={size} />
      <TextField
        value={value}
        onChange={handleNumberChange}
        type="number"
        size="small"
        inputProps={{ min: 0, max: 100, step: 5, 'aria-label': 'Progress percentage' }}
        sx={{ width: 74, flexShrink: 0 }}
      />
    </Stack>
  );
}
