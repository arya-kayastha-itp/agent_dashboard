import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useCreateAgent } from '../hooks/useAgents';
import AgentForm from './AgentForm';

const FORM_ID = 'add-agent-form';

export default function AddAgentModal({ open, onClose }) {
  const createAgent = useCreateAgent();

  const handleSubmit = async (values) => {
    await createAgent.mutateAsync({
      ...values,
      eta: values.eta || null,
      progress: Number(values.progress),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Agent</DialogTitle>
      <DialogContent>
        <AgentForm formId={FORM_ID} onSubmit={handleSubmit} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form={FORM_ID} variant="contained" disabled={createAgent.isPending}>
          Add Agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}
