import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { computeAgentHealth } from '../agentHealth';
import { formatAssignees } from '../formatters';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { FIELD_LABELS } from '../labels';
import { usePersona } from '../persona/PersonaContext';
import { canDeleteAgent } from '../persona/permissions';
import DeleteAgentButton from './DeleteAgentButton';
import MarketplaceTag from './MarketplaceTag';
import PendingReviewChip from './PendingReviewChip';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

const CARD_HEIGHT = 178;
const NEEDS_ATTENTION_LEVELS = [HEALTH_LEVELS.ATTENTION, HEALTH_LEVELS.AT_RISK];
// Room reserved at the header's right edge for the delete icon, which sits
// outside the card's click target (a button can't nest inside CardActionArea's).
const DELETE_BUTTON_GUTTER = 4;

export default function AgentCard({ agent, index = 0 }) {
  const navigate = useNavigate();
  const { persona } = usePersona();
  const showDelete = canDeleteAgent(persona);
  const health = computeAgentHealth(agent);
  const flagged = NEEDS_ATTENTION_LEVELS.includes(health.level);
  const { Icon: HealthIcon, color: healthColor } = HEALTH_LEVEL_META[health.level];

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        height: CARD_HEIGHT,
        position: 'relative',
        animation: 'g-rise 0.6s var(--g-ease) backwards',
        animationDelay: `${Math.min(index, 16) * 50 + 200}ms`,
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: alpha(theme.palette.primary.main, 0.4),
          boxShadow: `0 30px 50px -28px ${alpha(theme.palette.primary.main, 0.45)}`,
        },
      })}
    >
      <CardActionArea
        onClick={() => navigate(`/agents/${agent.id}`)}
        sx={{ height: '100%', alignItems: 'stretch' }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ flexShrink: 0, minWidth: 0, pr: showDelete ? DELETE_BUTTON_GUTTER : 0 }}>
            <MarketplaceTag agent={agent} iconOnly sx={{ mt: 0.25 }} />
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.84rem',
                fontWeight: 800,
                lineHeight: 1.35,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {agent.name}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1, flexShrink: 0 }}>
            <StatusBadge status={agent.currentStatus} />
            <PendingReviewChip agent={agent} compact />
          </Stack>

          <Box sx={{ mt: 1, flexShrink: 0 }}>
            {agent.assignees?.length > 0 && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {formatAssignees(agent)}
              </Typography>
            )}

            {agent.eta && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25 }}>
                {FIELD_LABELS.eta}: {format(new Date(agent.eta), 'PP')}
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 'auto', flexShrink: 0 }}>
            {flagged && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1, color: `${healthColor}.main`, minWidth: 0 }}>
                <HealthIcon sx={{ fontSize: 13, flexShrink: 0 }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'inherit', fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {health.reason}
                </Typography>
              </Stack>
            )}
            <ProgressBar progress={agent.currentProgress} />
          </Box>
        </CardContent>
      </CardActionArea>
      <DeleteAgentButton agent={agent} sx={{ position: 'absolute', top: 8, right: 8 }} />
    </Card>
  );
}
