import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useState } from 'react';
import { HEALTH_LEVEL_META, statusToHealthLevel } from '../healthLevel';
import ProgressBar from './ProgressBar';

// Leads with meaning (icon + color + one sentence); exact progress is only
// shown once expanded, per the "story, not a data table" redesign goal.
export default function UpdateStoryRow({ update }) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, color } = HEALTH_LEVEL_META[statusToHealthLevel(update.status)];
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
        px: 1,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '2px' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Icon fontSize="small" color={color} sx={{ mt: 0.25, flexShrink: 0 }} />

        <Typography variant="body2" noWrap={!expanded} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="span" variant="body2" color="text.secondary">
            {format(new Date(update.updateDate), 'PP')}:{' '}
          </Typography>
          <Typography component="span" variant="body2" fontWeight={600}>
            {update.status}
          </Typography>
          {notes && ` — ${notes}`}
        </Typography>

        <ExpandMoreIcon
          fontSize="small"
          aria-hidden="true"
          sx={{ mt: 0.25, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ pl: 4, pt: 1, maxWidth: 400 }}>
          <Typography variant="caption" color="text.secondary">
            Progress: {update.progress}%
          </Typography>
          <ProgressBar progress={update.progress} />
        </Box>
      </Collapse>
    </Box>
  );
}
