import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
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
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Open alerts">
        <Badge badgeContent={count} color={badgeColor}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 340 } }}>
        {count === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No open alerts
            </Typography>
          </MenuItem>
        )}

        {preview.map((alert) => (
          <MenuItem
            key={alert.id}
            onClick={() => {
              setAnchorEl(null);
              navigate('/finops');
            }}
            sx={{ whiteSpace: 'normal' }}
          >
            <div>
              <Typography variant="body2" fontWeight={600}>
                {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType} — {alert.agentName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getAlertHeadline(alert)}
              </Typography>
            </div>
          </MenuItem>
        ))}

        {count > 0 && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/finops');
            }}
          >
            <Typography variant="body2" color="primary">
              View all alerts
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
