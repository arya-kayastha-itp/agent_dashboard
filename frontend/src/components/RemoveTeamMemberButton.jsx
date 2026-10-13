import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { useDeleteTeamMember } from '../hooks/useTeamMembers';
import { useToast } from './ToastProvider';

// Removing someone also unassigns them from their agents and deletes their
// sign-in account, so the confirm dialog says exactly what that touches
// before anything happens.
export default function RemoveTeamMemberButton({ member, hasAccount }) {
  const deleteMember = useDeleteTeamMember();
  const showToast = useToast();
  const [open, setOpen] = useState(false);

  const agentNames = member.agents.map((agent) => agent.name);

  const handleConfirm = async () => {
    try {
      await deleteMember.mutateAsync(member.id);
      setOpen(false);
      showToast(`${member.name} was removed from the team.`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to remove team member. Please try again.', 'error');
    }
  };

  return (
    <>
      <Tooltip title="Remove from team">
        <IconButton size="small" color="error" aria-label={`Remove ${member.name}`} onClick={() => setOpen(true)}>
          <PersonRemoveIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={deleteMember.isPending ? undefined : () => setOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { '&::before': { bgcolor: 'error.main' } } }}
      >
        <DialogTitle>Remove {member.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {agentNames.length === 0
              ? `${member.name} isn't assigned to any agents.`
              : `${member.name} will be unassigned from ${agentNames.length === 1 ? 'this agent' : `these ${agentNames.length} agents`}: ${agentNames.join(', ')}. The agents themselves are kept — they just lose this assignee.`}
            {hasAccount && ' Their sign-in account is deleted too — to only block sign-in, deactivate them instead.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={deleteMember.isPending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirm} disabled={deleteMember.isPending}>
            {deleteMember.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
