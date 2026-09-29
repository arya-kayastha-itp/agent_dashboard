import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { useDeleteAgent } from '../hooks/useAgents';
import { usePersona } from '../persona/PersonaContext';
import { canDeleteAgent } from '../persona/permissions';
import { useToast } from './ToastProvider';

// Renders nothing for anyone but the Agent Manager (the API enforces the same
// rule). Deletion is permanent, so it always goes through a confirm dialog.
// `onDeleted` lets the caller react afterwards, e.g. leave the detail page of
// an agent that no longer exists.
export default function DeleteAgentButton({ agent, onDeleted, sx }) {
  const { persona } = usePersona();
  const deleteAgent = useDeleteAgent();
  const showToast = useToast();
  const [open, setOpen] = useState(false);

  if (!canDeleteAgent(persona)) return null;

  const handleConfirm = async () => {
    try {
      await deleteAgent.mutateAsync(agent.id);
      setOpen(false);
      showToast(`"${agent.name}" was deleted.`, 'success');
      onDeleted?.();
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to delete agent. Please try again.', 'error');
    }
  };

  return (
    <>
      <Tooltip title="Delete agent">
        <IconButton size="small" color="error" aria-label={`Delete ${agent.name}`} onClick={() => setOpen(true)} sx={sx}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={deleteAgent.isPending ? undefined : () => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete this agent?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{agent.name}&quot; and all of its progress history, usage data and alerts will be permanently deleted. This
            can&apos;t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={deleteAgent.isPending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirm} disabled={deleteAgent.isPending}>
            {deleteAgent.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
