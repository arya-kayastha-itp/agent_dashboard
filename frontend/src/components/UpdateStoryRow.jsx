import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { useState } from 'react';
import { HEALTH_LEVEL_META, statusToHealthLevel } from '../healthLevel';
import ProgressBar from './ProgressBar';

// Leads with meaning (icon + color + one sentence); exact progress is only
// shown once expanded, per the "story, not a data table" redesign goal.
export default function UpdateStoryRow({ update }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { Icon, color } = HEALTH_LEVEL_META[statusToHealthLevel(update.status)];
  const tone = color === 'default' ? theme.palette.text.secondary : theme.palette[color].main;
  const notes = update.statusDescription?.trim();

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((e) => !e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      sx={{
        py: 1,
        pr: 1.5,
        borderRadius: '13px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        '&:hover': { bgcolor: 'var(--g-surface-2)' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '2px' },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box sx={{ width: 34, flexShrink: 0, display: 'grid', placeItems: 'center', position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: tone,
              bgcolor: alpha(tone, 0.14),
              boxShadow: `0 0 0 4px ${theme.palette.background.paper}`,
            }}
          >
            <Icon sx={{ fontSize: 13 }} />
          </Box>
        </Box>

        <Typography variant="body2" noWrap={!expanded} color="text.secondary" sx={{ flexGrow: 1, minWidth: 0, pt: 0.5, lineHeight: 1.6 }}>
          <Typography component="span" variant="body2" sx={{ fontFamily: 'var(--g-mono)', fontSize: '0.72rem', color: 'text.disabled', mr: 0.5 }}>
            {format(new Date(update.updateDate), 'PP')}:{' '}
          </Typography>
          <Typography component="span" variant="body2" fontWeight={800} color="text.primary">
            {update.status}
          </Typography>
          {notes && ` — ${notes}`}
        </Typography>

        <ExpandMoreIcon
          fontSize="small"
          aria-hidden="true"
          sx={{ mt: 0.5, flexShrink: 0, color: 'text.disabled', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s var(--g-ease)' }}
        />
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ pl: 6.25, pt: 1, pb: 0.5, maxWidth: 440 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 0.75, fontFamily: 'var(--g-mono)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.disabled' }}
          >
            Progress: {update.progress}%
          </Typography>
          <ProgressBar progress={update.progress} />
        </Box>
      </Collapse>
    </Box>
  );
}
