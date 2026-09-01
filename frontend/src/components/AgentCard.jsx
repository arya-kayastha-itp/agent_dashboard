import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

const CARD_HEIGHT = 195;

export default function AgentCard({ agent }) {
  const navigate = useNavigate();

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
                ETA: {agent.eta.slice(0, 10)}
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

          <Box sx={{ mt: 1, flexShrink: 0 }}>
            <ProgressBar progress={agent.currentProgress} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
