import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import { FIELD_LABELS } from '../labels';

// The form control for the Marketplace Deployment tag, shared by Add Agent
// and Edit Agent. `value` / `onChange` follow react-hook-form's Controller.
export default function MarketplaceToggle({ value, onChange }) {
  return (
    <div>
      <FormControlLabel
        control={<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />}
        label={FIELD_LABELS.marketplaceDeployment}
      />
      <FormHelperText sx={{ mt: -0.5, ml: 0 }}>Turn on for agents that will be available on the marketplaces.</FormHelperText>
    </div>
  );
}
