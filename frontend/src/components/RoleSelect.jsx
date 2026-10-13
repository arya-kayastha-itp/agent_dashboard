import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { PERSONAS } from '../constants';
import { PERSONA_DESCRIPTIONS, PERSONA_LABELS } from '../labels';

// Most people invited are contributors, so that role leads the list.
const ROLE_ORDER = [PERSONAS.CONTRIBUTOR, PERSONAS.AGENT_MANAGER, PERSONAS.EXECUTIVE, PERSONAS.FINOPS];

export default function RoleSelect({ value, onChange, ...props }) {
  return (
    <TextField
      select
      label="Role"
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      SelectProps={{ renderValue: (role) => PERSONA_LABELS[role] }}
      {...props}
    >
      {ROLE_ORDER.map((role) => (
        <MenuItem key={role} value={role}>
          <ListItemText
            primary={PERSONA_LABELS[role]}
            secondary={PERSONA_DESCRIPTIONS[role]}
            primaryTypographyProps={{ fontWeight: 700 }}
            secondaryTypographyProps={{ sx: { whiteSpace: 'normal' } }}
          />
        </MenuItem>
      ))}
    </TextField>
  );
}
