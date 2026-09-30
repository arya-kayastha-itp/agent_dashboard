import StorefrontIcon from '@mui/icons-material/Storefront';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import { FIELD_LABELS } from '../labels';

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
          sx={{ fontSize: 14, flexShrink: 0, color: 'var(--g-accent-text)', ...sx }}
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
        height: 20,
        fontSize: 10,
        fontWeight: 800,
        color: 'text.primary',
        borderColor: alpha(theme.palette.primary.main, 0.45),
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        '& .MuiChip-icon': { fontSize: 12, color: 'var(--g-accent-text)' },
        ...sx,
      })}
    />
  );
}
