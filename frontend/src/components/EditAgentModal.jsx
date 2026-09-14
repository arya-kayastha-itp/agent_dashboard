import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateAgent } from '../hooks/useAgents';
import { FIELD_LABELS } from '../labels';
import { useToast } from './ToastProvider';

const FORM_ID = 'edit-agent-form';

function toDateInputValue(eta) {
  if (!eta) return '';
  try {
    return format(new Date(eta), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export default function EditAgentModal({ open, onClose, agent }) {
  const updateAgent = useUpdateAgent();
  const showToast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { name: '', description: '', assignedTo: '', eta: '' } });

  useEffect(() => {
    if (agent && open) {
      reset({
        name: agent.name || '',
        description: agent.description || '',
        assignedTo: agent.assignedTo || '',
        eta: toDateInputValue(agent.eta),
      });
    }
  }, [agent, open, reset]);

  const handleSave = async (values) => {
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        payload: { ...values, eta: values.eta || null },
      });
      showToast('Agent details updated.', 'success');
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to update agent. Please try again.', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Agent Details</DialogTitle>
      <DialogContent>
        <form id={FORM_ID} onSubmit={handleSubmit(handleSave)}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              required
              fullWidth
              error={Boolean(errors.name)}
              helperText={errors.name ? 'Name is required' : ''}
              {...register('name', { required: true })}
            />

            <TextField label="Description" fullWidth multiline minRows={2} {...register('description')} />

            <TextField label={FIELD_LABELS.assignedTo} fullWidth {...register('assignedTo')} />

            <TextField
              label={FIELD_LABELS.eta}
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('eta')}
            />
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form={FORM_ID} variant="contained" disabled={updateAgent.isPending}>
          {updateAgent.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
