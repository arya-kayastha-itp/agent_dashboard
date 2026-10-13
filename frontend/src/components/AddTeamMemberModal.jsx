import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { PERSONAS } from '../constants';
import { useCreateTeamMember } from '../hooks/useTeamMembers';
import { useCreateUser } from '../hooks/useUsers';
import AccountLink from './AccountLink';
import RoleSelect from './RoleSelect';
import { useToast } from './ToastProvider';

const FORM_ID = 'add-team-member-form';
const EMPTY_FORM = { name: '', email: '', role: PERSONAS.CONTRIBUTOR };

// Email is optional: without it the person is only added to the roster (so
// agents can be assigned to them) and can be invited later from their row.
export default function AddTeamMemberModal({ open, onClose }) {
  const createMember = useCreateTeamMember();
  const createUser = useCreateUser();
  const showToast = useToast();
  const [invite, setInvite] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY_FORM });
  const email = useWatch({ control, name: 'email' });

  // Reset once the close animation finishes, so the form doesn't flash back
  // in while the dialog fades out.
  const resetDialog = () => {
    reset(EMPTY_FORM);
    setInvite(null);
  };

  const isSaving = createMember.isPending || createUser.isPending;
  const hasEmail = (email || '').trim().length > 0;

  const onSubmit = async (values) => {
    let member;
    try {
      member = await createMember.mutateAsync({ name: values.name });
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to add team member. Please try again.', 'error');
      return;
    }

    if (!values.email.trim()) {
      showToast(`${member.name} was added to the team.`, 'success');
      onClose();
      return;
    }

    try {
      const { account, link } = await createUser.mutateAsync({ teamMemberId: member.id, email: values.email, role: values.role });
      setInvite({ name: member.name, email: account.email, link });
    } catch (err) {
      const reason = err?.response?.data?.error?.message || 'the invite failed.';
      showToast(`${member.name} was added, but ${reason} Use Invite on their row to try again.`, 'warning');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      TransitionProps={{ onExited: resetDialog }}
      fullWidth
      maxWidth={invite ? 'sm' : 'xs'}
    >
      <DialogTitle>{invite ? `${invite.name} is invited` : 'Add Member'}</DialogTitle>
      <DialogContent>
        {invite ? (
          <AccountLink link={invite.link} name={invite.name} email={invite.email} />
        ) : (
          <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Full name"
                required
                fullWidth
                autoFocus
                autoComplete="off"
                error={Boolean(errors.name)}
                helperText={errors.name ? 'Name is required' : ''}
                {...register('name', { required: true, validate: (value) => value.trim().length > 0 })}
              />
              <TextField
                label="Work email (optional)"
                type="email"
                fullWidth
                autoComplete="off"
                error={Boolean(errors.email)}
                helperText={errors.email ? 'Enter a valid email' : 'Add an email to invite them to sign in'}
                {...register('email', { validate: (value) => !value.trim() || /^\S+@\S+\.\S+$/.test(value.trim()) })}
              />
              {hasEmail && (
                <Controller name="role" control={control} render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} />} />
              )}
            </Stack>
          </form>
        )}
      </DialogContent>
      <DialogActions>
        {invite ? (
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="contained" disabled={isSaving}>
              {isSaving ? 'Adding…' : hasEmail ? 'Add and invite' : 'Add Member'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
