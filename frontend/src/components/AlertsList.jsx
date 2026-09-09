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
import { format } from 'date-fns';
import { useState } from 'react';
import { getAlertExplainer, getAlertHeadline } from '../alertCopy';
import { ALERT_TYPE_LABELS } from '../constants';
import { getAlertHealthLevel } from '../healthLevel';
import { useAlerts, useUpdateAlertStatus } from '../hooks/useAlerts';
import HealthChip from './HealthChip';
import InfoTooltip from './InfoTooltip';

const TABS = ['open', 'acknowledged', 'resolved'];

function AlertCard({ alert, onUpdateStatus, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const level = getAlertHealthLevel(alert);
  const explainer = getAlertExplainer(alert.alertType);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <HealthChip level={level} />
            <Typography variant="subtitle2" color="text.secondary">
              {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
            </Typography>
            {explainer && <InfoTooltip title={explainer} />}
          </Stack>

          <Typography variant="body1">{getAlertHeadline(alert)}</Typography>

          <Typography variant="caption" color="text.secondary">
            {alert.agentName} · {format(new Date(alert.createdAt), 'PPp')}
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
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Original message
          </Typography>
          <Typography variant="body2">{alert.message}</Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}

export default function AlertsList() {
  const [tab, setTab] = useState('open');
  const { data: alerts, isLoading, isError } = useAlerts({ status: tab });
  const updateStatus = useUpdateAlertStatus();

  return (
    <Paper variant="outlined">
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => (
          <Tab key={t} value={t} label={t[0].toUpperCase() + t.slice(1)} />
        ))}
      </Tabs>

      <Box sx={{ p: 2 }}>
        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading alerts…</Typography>
          </Stack>
        )}
        {isError && <Alert severity="error">Failed to load alerts.</Alert>}
        {alerts && alerts.length === 0 && <Alert severity="info">No {tab} alerts.</Alert>}

        <Stack spacing={1.5}>
          {alerts?.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isPending={updateStatus.isPending}
              onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })}
            />
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}
