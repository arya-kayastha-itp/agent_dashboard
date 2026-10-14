import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentSummaryRow from './AgentSummaryRow';
import { SubmitForm } from './SubmitUpdateForm';

export const CONTRIBUTOR_ROW_COLUMN_COUNT = 5;

// Outcomes of your own last update that still need you (a pending one is
// already shown by the row's "Pending review" badge).
const NEEDS_YOU = {
  changes_requested: { label: 'Changes requested', color: 'warning' },
  rejected: { label: 'Not accepted', color: 'error' },
};

// One row of a contributor's My Agents table: the same read-only row shape as
// the Agent Manager's and Executive's lists, with "Send update" expanding the
// review form underneath — the contributor's version of the manager's inline
// "Update".
export default function ContributorAgentRow({ agent, latest }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const needsYou = latest && NEEDS_YOU[latest.reviewStatus];

  return (
    <>
      <TableRow
        hover
        sx={{
          '& > td': { borderBottom: expanded ? 'none' : undefined },
          bgcolor: expanded ? 'var(--g-surface-2)' : undefined,
          animation: 'g-fade 0.5s ease 0.2s backwards',
        }}
      >
        <AgentSummaryRow
          agent={agent}
          onNameClick={() => navigate(`/agents/${agent.id}`)}
          trailing={
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              {needsYou && <Chip size="small" variant="outlined" color={needsYou.color} label={needsYou.label} sx={{ height: 22, fontWeight: 700 }} />}
              <Button
                size="small"
                variant="outlined"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                endIcon={<ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s var(--g-ease)' }} />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {expanded ? 'Close' : 'Send update'}
              </Button>
            </Stack>
          }
        />
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={CONTRIBUTOR_ROW_COLUMN_COUNT} sx={{ p: 0, bgcolor: 'var(--g-surface-2)' }}>
            <Box
              sx={{
                px: { xs: 2, md: 3 },
                pt: 2.5,
                pb: 3,
                borderTop: '1px dashed var(--g-line-2)',
                animation: 'g-open 0.45s var(--g-ease) both',
              }}
            >
              {/* Keyed by the latest submission so the form restarts from it once it changes. */}
              <SubmitForm
                key={latest ? `${latest.id}-${latest.reviewStatus}` : 'none'}
                agent={agent}
                latest={latest}
                inline
                onCancel={() => setExpanded(false)}
                onSent={() => setExpanded(false)}
              />
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
