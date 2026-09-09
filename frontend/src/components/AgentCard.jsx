import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { FIELD_LABELS } from '../labels';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

const CARD_HEIGHT = 215;
const NEEDS_ATTENTION_LEVELS = [HEALTH_LEVELS.ATTENTION, HEALTH_LEVELS.AT_RISK];

export default function AgentCard({ agent }) {
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
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
