import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { HEALTH_LEVELS, HEALTH_LEVEL_META } from '../healthLevel';
import { useCountUp } from '../hooks/useCountUp';

const numberSx = {
  fontFamily: 'var(--g-display)',
  fontWeight: 600,
  fontSize: { xs: 28, md: 40 },
  lineHeight: 0.95,
  letterSpacing: '-0.04em',
  fontVariantNumeric: 'tabular-nums',
};

const labelSx = { fontSize: { xs: 12, md: 13 }, fontWeight: 700, color: 'text.secondary' };

// Shared card shell: entrance rise (staggered by `index`), a soft corner glow
// in the card's colour, and a ring when the card is the active filter.
function cardSx(main, active, index) {
  return {
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    minHeight: { xs: 90, md: 116 },
    borderColor: active ? alpha(main, 0.65) : 'divider',
    bgcolor: active ? alpha(main, 0.08) : 'background.paper',
    boxShadow: active ? `0 0 0 4px ${alpha(main, 0.14)}, var(--g-shadow)` : 'var(--g-shadow)',
    animation: 'g-rise 0.7s var(--g-ease) backwards',
    animationDelay: `${index * 80}ms`,
    '&::after': {
      content: '""',
      position: 'absolute',
      right: '-30%',
      bottom: '-70%',
      width: 220,
      height: 220,
      borderRadius: '50%',
      background: `radial-gradient(closest-side, ${alpha(main, 0.22)}, transparent)`,
      opacity: active ? 1 : 0.5,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    },
  };
}

function StatCard({ level, count, active, onClick, index }) {
  const theme = useTheme();
  const { Icon, color, label } = HEALTH_LEVEL_META[level];
  const mainColor = theme.palette[color].main;
  const shown = useCountUp(count);

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardSx(mainColor, active, index),
        '&:hover': { transform: 'translateY(-3px)', borderColor: alpha(mainColor, active ? 0.65 : 0.45) },
      }}
    >
      <CardActionArea
        onClick={onClick}
        aria-pressed={active}
        sx={{ height: '100%', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between', gap: 1.5 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
          <Typography sx={labelSx} noWrap>
            {label}
          </Typography>
          <Box
            sx={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: '9px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(mainColor, 0.15),
              color: mainColor,
            }}
          >
            <Icon sx={{ fontSize: 17 }} />
          </Box>
        </Stack>
        <Typography component="div" sx={numberSx}>
          {shown}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

// Total isn't a health level and isn't filterable — plain count, no icon, no
// click — but it leads the row since it's the headline KPI everything else
// breaks down from.
function TotalCard({ count }) {
  const theme = useTheme();
  const shown = useCountUp(count);

  return (
    <Card variant="outlined" sx={cardSx(theme.palette.primary.main, false, 0)}>
      <Box sx={{ height: '100%', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 1.5 }}>
        <Typography sx={labelSx} noWrap>
          Total agents
        </Typography>
        <Typography component="div" sx={{ ...numberSx, color: 'var(--g-accent-text)' }}>
          {shown}
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
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${cards.length + 1}, minmax(0, 1fr))` },
          gap: { xs: 1.25, md: 2 },
        }}
      >
        <TotalCard count={total} />
        {cards.map((c, i) => (
          <StatCard
            key={c.level}
            level={c.level}
            count={c.count}
            index={i + 1}
            active={activeFilter === c.level}
            onClick={() => handleToggle(c.level)}
          />
        ))}
      </Box>

      {activeFilter && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1.5, display: 'block', fontWeight: 600, animation: 'g-rise 0.35s var(--g-ease) backwards' }}
        >
          Showing only "{HEALTH_LEVEL_META[activeFilter]?.label}" projects — click the card again to show all.
        </Typography>
      )}
    </Box>
  );
}
