import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { useState } from 'react';
import { getAlertExplainer, getAlertHeadline } from '../alertCopy';
import { ALERT_TYPE_LABELS } from '../constants';
import { getAlertHealthLevel, HEALTH_LEVEL_META } from '../healthLevel';
import { useAlerts, useUpdateAlertStatus } from '../hooks/useAlerts';
import HealthChip from './HealthChip';
import InfoTooltip from './InfoTooltip';

const TABS = ['open', 'acknowledged', 'resolved'];

// Segmented control look for the status tabs — same Tabs behavior underneath.
const segmentedTabsSx = {
  minHeight: 0,
  p: 0.5,
  borderRadius: '12px',
  bgcolor: 'var(--g-field)',
  border: 1,
  borderColor: 'divider',
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTabs-flexContainer': { gap: 0.5 },
  '& .MuiTab-root': {
    minHeight: 32,
    minWidth: 0,
    py: 0,
    px: 2,
    borderRadius: '9px',
    fontSize: '0.78rem',
    fontWeight: 800,
    textTransform: 'none',
    color: 'text.secondary',
    transition: 'background-color 0.25s var(--g-ease), color 0.25s var(--g-ease), box-shadow 0.25s ease',
    '&:hover': { color: 'text.primary' },
  },
  '& .MuiTab-root.Mui-selected': {
    color: 'text.primary',
    bgcolor: 'var(--g-surface-3)',
    boxShadow: '0 8px 18px -10px rgba(0, 0, 0, 0.7)',
  },
};

function AlertCard({ alert, onUpdateStatus, isPending, index }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const level = getAlertHealthLevel(alert);
  const explainer = getAlertExplainer(alert.alertType);
  const main = theme.palette[HEALTH_LEVEL_META[level].color].main;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: '14px',
        boxShadow: 'none',
        bgcolor: 'var(--g-surface-2)',
        backgroundImage: `radial-gradient(420px 140px at 0 0, ${alpha(main, 0.11)}, transparent 70%)`,
        transition: 'border-color 0.25s ease',
        '&:hover': { borderColor: 'var(--g-line-2)' },
        animation: 'g-rise 0.6s var(--g-ease) backwards',
        animationDelay: `${Math.min(index, 8) * 70 + 80}ms`,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <HealthChip level={level} />
            <Typography variant="subtitle2" color="text.secondary">
              {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
            </Typography>
            {explainer && <InfoTooltip title={explainer} />}
          </Stack>

          <Typography variant="body1" sx={{ mt: 1.25, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.45, maxWidth: 760 }}>
            {getAlertHeadline(alert)}
          </Typography>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem' }}>
              {alert.agentName}
            </Box>
            {' · '}
            <Box component="span" sx={{ fontFamily: 'var(--g-mono)', fontWeight: 500 }}>
              {format(new Date(alert.createdAt), 'PPp')}
            </Box>
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {alert.status === 'open' && (
            <Button size="small" onClick={() => onUpdateStatus(alert.id, 'acknowledged')} disabled={isPending}>
              Acknowledge
            </Button>
          )}
          {alert.status !== 'resolved' && (
            <Button size="small" variant="contained" onClick={() => onUpdateStatus(alert.id, 'resolved')} disabled={isPending}>
              Resolve
            </Button>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Hide details' : 'Show details'}
            aria-expanded={expanded}
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s var(--g-ease)' }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed var(--g-line-2)' }}>
          <Typography
            variant="caption"
            display="block"
            sx={{ fontFamily: 'var(--g-mono)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.disabled' }}
          >
            Original message
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, fontFamily: 'var(--g-mono)', fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.6 }}>
            {alert.message}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}

// `title`, when given, sits on the same row as the status tabs.
export default function AlertsList({ title }) {
  const [tab, setTab] = useState('open');
  const { data: alerts, isLoading, isError } = useAlerts({ status: tab });
  const updateStatus = useUpdateAlertStatus();

  return (
    <Paper variant="outlined" sx={{ animation: 'g-rise 0.7s var(--g-ease) backwards' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ px: 3, pt: 2.75 }}
      >
        {title && <Typography variant="h6">{title}</Typography>}
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={segmentedTabsSx}>
          {TABS.map((t) => (
            <Tab key={t} value={t} label={t[0].toUpperCase() + t.slice(1)} disableRipple />
          ))}
        </Tabs>
      </Stack>

      <Box sx={{ p: 3, pt: 2.5 }}>
        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading alerts…</Typography>
          </Stack>
        )}
        {isError && <Alert severity="error">Failed to load alerts.</Alert>}
        {alerts && alerts.length === 0 && <Alert severity="info">No {tab} alerts.</Alert>}

        <Stack spacing={1.5}>
          {alerts?.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              index={index}
              isPending={updateStatus.isPending}
              onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })}
            />
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}
