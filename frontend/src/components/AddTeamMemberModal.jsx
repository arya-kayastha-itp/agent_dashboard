import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateTeamMember } from '../hooks/useTeamMembers';
import { useToast } from './ToastProvider';

const FORM_ID = 'add-team-member-form';

export default function AddTeamMemberModal({ open, onClose }) {
  const createMember = useCreateTeamMember();
  const showToast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { name: '' } });

  useEffect(() => {
    if (open) reset({ name: '' });
  }, [open, reset]);

  const onSubmit = async (values) => {
    try {
      const member = await createMember.mutateAsync({ name: values.name });
      showToast(`${member.name} was added to the team.`, 'success');
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to add team member. Please try again.', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add Member</DialogTitle>
      <DialogContent>
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Full name"
            required
            fullWidth
            autoFocus
            autoComplete="off"
            sx={{ mt: 1 }}
            error={Boolean(errors.name)}
            helperText={errors.name ? 'Name is required' : ''}
            {...register('name', { required: true, validate: (value) => value.trim().length > 0 })}
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form={FORM_ID} variant="contained" disabled={createMember.isPending}>
          {createMember.isPending ? 'Adding…' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
