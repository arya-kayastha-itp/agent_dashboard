import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PERSONAS } from '../constants';
import { useCreateUser } from '../hooks/useUsers';
import AccountLink from './AccountLink';
import RoleSelect from './RoleSelect';
import { useToast } from './ToastProvider';

const FORM_ID = 'invite-member-form';

// Gives an existing team member a sign-in account, then shows their invite link.
export default function InviteMemberDialog({ member, open, onClose }) {
  const createUser = useCreateUser();
  const showToast = useToast();
  const [invite, setInvite] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', role: PERSONAS.CONTRIBUTOR } });

  // Reset once the close animation finishes, so the form doesn't flash back
  // in while the dialog fades out.
  const resetDialog = () => {
    reset({ email: '', role: PERSONAS.CONTRIBUTOR });
    setInvite(null);
  };

  const onSubmit = async ({ email, role }) => {
    try {
      const { account, link } = await createUser.mutateAsync({ teamMemberId: member.id, email, role });
      setInvite({ link, email: account.email });
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to send the invite. Please try again.', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={createUser.isPending ? undefined : onClose}
      TransitionProps={{ onExited: resetDialog }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{invite ? `${member.name} is invited` : `Invite ${member.name}`}</DialogTitle>
      <DialogContent>
        {invite ? (
          <AccountLink link={invite.link} name={member.name} email={invite.email} />
        ) : (
          <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Work email"
                type="email"
                required
                fullWidth
                autoFocus
                autoComplete="off"
                error={Boolean(errors.email)}
                helperText={errors.email ? 'Enter a valid email' : 'Any domain works, including other organisations'}
                {...register('email', { required: true, pattern: /^\S+@\S+\.\S+$/ })}
              />
              <Controller name="role" control={control} render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} />} />
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
            <Button onClick={onClose} disabled={createUser.isPending}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="contained" disabled={createUser.isPending}>
              {createUser.isPending ? 'Inviting…' : 'Send invite'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
