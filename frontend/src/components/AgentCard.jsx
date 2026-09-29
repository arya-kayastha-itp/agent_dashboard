import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import { formatAssignees } from '../formatters';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { FIELD_LABELS } from '../labels';
import { usePersona } from '../persona/PersonaContext';
import { canDeleteAgent } from '../persona/permissions';
import DeleteAgentButton from './DeleteAgentButton';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

const CARD_HEIGHT = 168;
const NEEDS_ATTENTION_LEVELS = [HEALTH_LEVELS.ATTENTION, HEALTH_LEVELS.AT_RISK];
// Room reserved at the header's right edge for the delete icon, which sits
// outside the card's click target (a button can't nest inside CardActionArea's).
const DELETE_BUTTON_GUTTER = 4;

export default function AgentCard({ agent }) {
  const navigate = useNavigate();
  const { persona } = usePersona();
  const showDelete = canDeleteAgent(persona);
  const health = computeAgentHealth(agent);
  const flagged = NEEDS_ATTENTION_LEVELS.includes(health.level);
  const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];

  return (
    <Card variant="outlined" sx={{ height: CARD_HEIGHT, position: 'relative' }}>
      <CardActionArea
        onClick={() => navigate(`/agents/${agent.id}`)}
        sx={{ height: '100%', alignItems: 'stretch' }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ flexShrink: 0, pr: showDelete ? DELETE_BUTTON_GUTTER : 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
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

          <Box sx={{ mt: 0.25, mb: 0.5, flexShrink: 0 }}>
            {agent.assignees?.length > 0 && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {formatAssignees(agent)}
              </Typography>
            )}

            {agent.eta && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {FIELD_LABELS.eta}: {format(new Date(agent.eta), 'PP')}
              </Typography>
            )}
          </Box>

          {flagged && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5, flexShrink: 0 }}>
              <HealthIcon fontSize="inherit" sx={{ fontSize: 14 }} color={healthColor} />
              <Typography
                variant="caption"
                color={`${healthColor}.main`}
                sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {health.reason}
              </Typography>
            </Stack>
          )}

          <Box sx={{ mt: 'auto', flexShrink: 0 }}>
            <ProgressBar progress={agent.currentProgress} />
          </Box>
        </CardContent>
      </CardActionArea>
      <DeleteAgentButton agent={agent} sx={{ position: 'absolute', top: 8, right: 8 }} />
    </Card>
  );
}
