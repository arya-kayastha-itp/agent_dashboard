import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlertHeadline } from '../alertCopy';
import { ALERT_TYPE_LABELS } from '../constants';
import { getAlertHealthLevel, HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { useOpenAlertsCount } from '../hooks/useAlerts';

export default function AlertBell() {
  const { data: openAlerts } = useOpenAlertsCount();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const count = openAlerts?.length || 0;
  const preview = openAlerts?.slice(0, 5) || [];
  const worstLevel = openAlerts?.some((a) => getAlertHealthLevel(a) === HEALTH_LEVELS.AT_RISK)
    ? HEALTH_LEVELS.AT_RISK
    : HEALTH_LEVELS.ATTENTION;
  const badgeColor = count > 0 ? HEALTH_LEVEL_META[worstLevel].color : 'default';

  return (
    <>
      <IconButton
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Open alerts"
        sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'var(--g-surface-2)' } }}
      >
        <Badge badgeContent={count} color={badgeColor}>
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 330 } }}>
        {count === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No open alerts
            </Typography>
          </MenuItem>
        )}

        {preview.map((alert) => {
          const { Icon, color } = HEALTH_LEVEL_META[getAlertHealthLevel(alert)];
          return (
            <MenuItem
              key={alert.id}
              onClick={() => {
                setAnchorEl(null);
                navigate('/');
              }}
              sx={{ whiteSpace: 'normal', alignItems: 'flex-start', gap: 1.5, py: 1.5 }}
            >
              <Icon fontSize="small" color={color} sx={{ mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={800}>
                  {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType} — {alert.agentName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.45 }}>
                  {getAlertHeadline(alert)}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}

        {count > 0 && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/');
            }}
            sx={{ justifyContent: 'center', mt: 0.5, borderTop: 1, borderColor: 'divider', borderRadius: '0 0 10px 10px' }}
          >
            <Typography variant="body2" fontWeight={800} sx={{ color: 'var(--g-accent-text)' }}>
              View all alerts
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
