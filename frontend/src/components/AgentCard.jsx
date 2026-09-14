import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import { formatCurrency, formatPercent } from '../formatters';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { FIELD_LABELS } from '../labels';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

const CARD_HEIGHT = 280;
const NEEDS_ATTENTION_LEVELS = [HEALTH_LEVELS.ATTENTION, HEALTH_LEVELS.AT_RISK];

export default function AgentCard({ agent, insights }) {
  const navigate = useNavigate();
  const health = computeAgentHealth(agent);
  const flagged = NEEDS_ATTENTION_LEVELS.includes(health.level);
  const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];

  return (
    <Card variant="outlined" sx={{ height: CARD_HEIGHT }}>
      <CardActionArea
        onClick={() => navigate(`/agents/${agent.id}`)}
        sx={{ height: '100%', alignItems: 'stretch' }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ flexShrink: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {agent.name}
            </Typography>
            <StatusBadge status={agent.currentStatus} />
          </Stack>

          <Box sx={{ mt: 0.5, mb: 1, flexShrink: 0 }}>
            {agent.assignedTo && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {agent.assignedTo}
              </Typography>
            )}

            {agent.eta && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {FIELD_LABELS.eta}: {format(new Date(agent.eta), 'PP')}
              </Typography>
            )}
          </Box>

          {agent.currentStatusDescription && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                flexShrink: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {agent.currentStatusDescription}
            </Typography>
          )}

          {flagged && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, flexShrink: 0 }}>
              <HealthIcon fontSize="inherit" sx={{ fontSize: 14 }} color={healthColor} />
              <Typography variant="caption" color={`${healthColor}.main`}>
                {health.reason}
              </Typography>
            </Stack>
          )}

          <Box sx={{ mt: 1, flexShrink: 0 }}>
            <ProgressBar progress={agent.currentProgress} />
          </Box>

          {insights && (
            <>
              <Divider sx={{ mt: 1.25, mb: 1 }} />
              <Box sx={{ flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  This month
                </Typography>
                {insights.calls === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No usage logged yet
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={1.5}>
                    <Typography variant="caption">{insights.calls} calls</Typography>
                    <Typography variant="caption">{formatCurrency(insights.cost)}</Typography>
                    <Typography variant="caption" color={insights.errorRate > 0 ? 'warning.main' : 'text.secondary'}>
                      {formatPercent(insights.errorRate)} errors
                    </Typography>
                  </Stack>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
