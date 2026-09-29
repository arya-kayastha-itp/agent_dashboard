import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';

function StatCard({ level, count, active, onClick }) {
  const theme = useTheme();
  const { Icon, color, label } = HEALTH_LEVEL_META[level];
  const mainColor = theme.palette[color].main;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: active ? mainColor : 'divider',
        bgcolor: active ? alpha(mainColor, 0.06) : 'background.paper',
      }}
    >
      <CardActionArea onClick={onClick} aria-pressed={active} sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Icon color={color} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
              {count}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

// Total isn't a health level and isn't filterable — plain count, no icon, no
// click — but it leads the row since it's the headline KPI everything else
// breaks down from.
function TotalCard({ count }) {
  return (
    <Card variant="outlined">
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
          {count}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          Total agents
        </Typography>
      </Box>
    </Card>
  );
}

// The rollup as a row of stat cards instead of a sentence + chip cluster —
// same click-to-filter behavior, a fraction of the vertical space.
export default function DashboardSummaryBanner({ summary, activeFilter, onFilterChange }) {
  const { total, onTrack, attention, atRisk } = summary;
  if (!total) return null;

  const handleToggle = (level) => {
    onFilterChange(activeFilter === level ? null : level);
  };

  const cards = [
    { level: HEALTH_LEVELS.HEALTHY, count: onTrack },
    { level: HEALTH_LEVELS.ATTENTION, count: attention },
    { level: HEALTH_LEVELS.AT_RISK, count: atRisk },
  ].filter((c) => c.count > 0);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cards.length + 1}, minmax(150px, 1fr))`,
          gap: 1.5,
        }}
      >
        <TotalCard count={total} />
        {cards.map((c) => (
          <StatCard
            key={c.level}
            level={c.level}
            count={c.count}
            active={activeFilter === c.level}
            onClick={() => handleToggle(c.level)}
          />
        ))}
      </Box>

      {activeFilter && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
          Showing only "{HEALTH_LEVEL_META[activeFilter]?.label}" projects — click the card again to show all.
        </Typography>
      )}
    </Box>
  );
}
