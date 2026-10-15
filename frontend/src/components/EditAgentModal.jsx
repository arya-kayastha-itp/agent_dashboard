import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { isLaterDate } from '../agentRules';
import { toDateInputValue } from '../formatters';
import { useUpdateAgent } from '../hooks/useAgents';
import { FIELD_LABELS } from '../labels';
import { openNativePicker } from '../nativePicker';
import AssigneeSelect from './AssigneeSelect';
import MarketplaceToggle from './MarketplaceToggle';
import { useToast } from './ToastProvider';

const FORM_ID = 'edit-agent-form';

export default function EditAgentModal({ open, onClose, agent }) {
  const updateAgent = useUpdateAgent();
  const showToast = useToast();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', description: '', assigneeIds: [], marketplaceDeployment: false, eta: '', etaChangeReason: '' },
  });
  const originalEta = toDateInputValue(agent?.eta);
  const eta = useWatch({ control, name: 'eta' });
  // Pushing the target date later is a slip, and needs a reason on record.
  const etaSlips = isLaterDate(eta, originalEta);

  useEffect(() => {
    if (agent && open) {
      reset({
        name: agent.name || '',
        description: agent.description || '',
        assigneeIds: (agent.assignees || []).map((assignee) => assignee.id),
        marketplaceDeployment: Boolean(agent.marketplaceDeployment),
        eta: toDateInputValue(agent.eta),
        etaChangeReason: '',
      });
    }
  }, [agent, open, reset]);

  const handleSave = async ({ etaChangeReason, ...values }) => {
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        payload: { ...values, eta: values.eta || null, ...(etaSlips ? { etaChangeReason } : {}) },
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

            <Controller
              name="assigneeIds"
              control={control}
              render={({ field }) => <AssigneeSelect value={field.value} onChange={field.onChange} />}
            />

            <Controller
              name="marketplaceDeployment"
              control={control}
              render={({ field }) => <MarketplaceToggle value={field.value} onChange={field.onChange} />}
            />

            <TextField
              label={FIELD_LABELS.eta}
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ onClick: openNativePicker }}
              {...register('eta')}
            />

            {etaSlips && (
              <TextField
                label="Why is the target date moving later?"
                required
                fullWidth
                multiline
                error={Boolean(errors.etaChangeReason)}
                helperText={errors.etaChangeReason ? 'A reason is needed when the date moves later' : 'Kept in the target date history'}
                {...register('etaChangeReason', { validate: (value) => !etaSlips || value.trim().length > 0 })}
              />
            )}
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
