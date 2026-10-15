import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

// Shown wherever a status can be set to Blocked. Both fields are required
// when the agent is becoming Blocked (the API enforces it); for an agent
// that's already Blocked they start from what's recorded and may be updated.
export default function BlockerFields({ reason, blockedBy, onChange, required = false, size = 'medium', direction = 'column', sx }) {
  return (
    <Stack direction={{ xs: 'column', md: direction }} spacing={direction === 'row' ? 2 : 1.5} sx={sx}>
      <TextField
        label="Why is it blocked?"
        size={size}
        fullWidth
        multiline
        minRows={1}
        required={required}
        value={reason || ''}
        onChange={(event) => onChange({ blockerReason: event.target.value })}
      />
      <TextField
        label="Who or what can unblock it?"
        placeholder="A person, team or dependency"
        size={size}
        fullWidth
        required={required}
        value={blockedBy || ''}
        onChange={(event) => onChange({ blockedBy: event.target.value })}
      />
    </Stack>
  );
}
