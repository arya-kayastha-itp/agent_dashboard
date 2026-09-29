import StorefrontIcon from '@mui/icons-material/Storefront';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import { FIELD_LABELS } from '../labels';

// Teal accent that stays readable on both themes. (The theme's `secondary`
// colour is the same navy as the dark background, so it can't be used here.)
const accent = (theme) => (theme.palette.mode === 'dark' ? '#5EEAD4' : theme.palette.primary.dark);

// The "Marketplace Deployment" tag shown on agents headed for the
// marketplaces. Renders nothing for untagged agents so callers can drop it in
// unconditionally. `iconOnly` is for space-constrained spots (the fixed-height
// card grid): just the storefront icon, with the tag name on hover.
export default function MarketplaceTag({ agent, iconOnly = false, sx }) {
  if (!agent?.marketplaceDeployment) return null;

  if (iconOnly) {
    return (
      <Tooltip title={FIELD_LABELS.marketplaceDeployment}>
        <StorefrontIcon
          aria-label={FIELD_LABELS.marketplaceDeployment}
          sx={(theme) => ({ fontSize: 16, flexShrink: 0, color: accent(theme), ...sx })}
        />
      </Tooltip>
    );
  }

  return (
    <Chip
      size="small"
      variant="outlined"
      icon={<StorefrontIcon />}
      label={FIELD_LABELS.marketplaceDeployment}
      sx={(theme) => ({
        height: 22,
        fontSize: 11,
        color: accent(theme),
        borderColor: alpha(theme.palette.primary.main, 0.7),
        backgroundColor: alpha(theme.palette.primary.main, 0.16),
        '& .MuiChip-icon': { fontSize: 14, color: 'inherit' },
        ...sx,
      })}
    />
  );
}
