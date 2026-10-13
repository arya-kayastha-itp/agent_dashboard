import MoreVertIcon from '@mui/icons-material/MoreVert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useSendNewLink, useUpdateUser } from '../hooks/useUsers';
import { ACCOUNT_STATUS_LABELS, PERSONA_LABELS } from '../labels';
import AccountLink from './AccountLink';
import InviteMemberDialog from './InviteMemberDialog';
import RoleSelect from './RoleSelect';
import { useToast } from './ToastProvider';

const STATUS_CHIP_COLORS = { invited: 'warning', active: 'success', deactivated: 'default' };

// An invited account either has a live link, one that ran out, or none at all
// (e.g. created by a migration and never sent one).
function inviteLabel(account) {
  if (!account.linkExpiresAt) return 'Link not sent';
  if (new Date(account.linkExpiresAt) <= new Date()) return 'Invite expired';
  return null;
}

const errorMessage = (err, fallback) => err?.response?.data?.error?.message || fallback;

// The "Access" cell: role and account state, or a plain "No account".
export function AccessSummary({ account }) {
  if (!account) {
    return (
      <Typography variant="body2" color="text.secondary">
        No account
      </Typography>
    );
  }
  const needsLink = account.status === 'invited' ? inviteLabel(account) : null;
  return (
    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
        {PERSONA_LABELS[account.role]}
      </Typography>
      <Chip
        size="small"
        variant={needsLink ? 'outlined' : 'filled'}
        color={STATUS_CHIP_COLORS[account.status]}
        label={needsLink || ACCOUNT_STATUS_LABELS[account.status]}
        sx={{ height: 22 }}
      />
    </Stack>
  );
}

// Invite button for people without an account; otherwise a menu to send a
// fresh link, change role, or deactivate/reactivate. Your own row only
// offers a password reset link — the API refuses changes to your own access.
export default function MemberAccessActions({ member, account, isSelf }) {
  const showToast = useToast();
  const sendNewLink = useSendNewLink();
  const updateUser = useUpdateUser();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [dialog, setDialog] = useState(null); // 'invite' | 'link' | 'role' | 'deactivate'
  const [link, setLink] = useState(null);
  const [role, setRole] = useState(account?.role);

  const closeDialog = () => setDialog(null);
  const pick = (next) => () => {
    setMenuAnchor(null);
    next();
  };

  if (!account) {
    return (
      <>
        <Button size="small" variant="outlined" onClick={() => setDialog('invite')}>
          Invite
        </Button>
        <InviteMemberDialog member={member} open={dialog === 'invite'} onClose={closeDialog} />
      </>
    );
  }

  const handleSendLink = async () => {
    try {
      setLink(await sendNewLink.mutateAsync(account.id));
      setDialog('link');
    } catch (err) {
      showToast(errorMessage(err, 'Failed to create a link. Please try again.'), 'error');
    }
  };

  const handleUpdate = async (payload, successMessage) => {
    try {
      await updateUser.mutateAsync({ id: account.id, ...payload });
      closeDialog();
      showToast(successMessage, 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Failed to update access. Please try again.'), 'error');
    }
  };

  const isDeactivated = account.status === 'deactivated';
  const linkLabel = account.status === 'invited' ? 'Send new invite link' : 'Send password reset link';

  return (
    <>
      <Tooltip title="Account actions">
        <IconButton size="small" aria-label={`Account actions for ${member.name}`} onClick={(event) => setMenuAnchor(event.currentTarget)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {!isDeactivated && <MenuItem onClick={pick(handleSendLink)}>{linkLabel}</MenuItem>}
        {!isSelf && !isDeactivated && (
          <MenuItem
            onClick={pick(() => {
              setRole(account.role);
              setDialog('role');
            })}
          >
            Change role
          </MenuItem>
        )}
        {!isSelf && !isDeactivated && (
          <MenuItem onClick={pick(() => setDialog('deactivate'))} sx={{ color: 'error.main' }}>
            Deactivate
          </MenuItem>
        )}
        {!isSelf && isDeactivated && (
          <MenuItem onClick={pick(() => handleUpdate({ status: 'active' }, `${member.name} was reactivated.`))}>Reactivate</MenuItem>
        )}
      </Menu>

      <Dialog open={dialog === 'link'} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{link?.purpose === 'invite' ? `New invite link for ${member.name}` : `Password reset link for ${member.name}`}</DialogTitle>
        <DialogContent>{link && <AccountLink link={link} name={member.name} email={account.email} />}</DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeDialog}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === 'role'} onClose={updateUser.isPending ? undefined : closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Change {member.name}&apos;s role</DialogTitle>
        <DialogContent>
          <RoleSelect value={role} onChange={setRole} sx={{ mt: 1 }} />
          <DialogContentText variant="body2" sx={{ mt: 2 }}>
            {member.name.split(' ')[0]} will be signed out and see the new role next time they sign in.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={updateUser.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={updateUser.isPending || role === account.role}
            onClick={() => handleUpdate({ role }, `${member.name} is now ${PERSONA_LABELS[role]}.`)}
          >
            {updateUser.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialog === 'deactivate'}
        onClose={updateUser.isPending ? undefined : closeDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { '&::before': { bgcolor: 'error.main' } } }}
      >
        <DialogTitle>Deactivate {member.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {member.name.split(' ')[0]} will be signed out straight away and won&apos;t be able to sign in until you reactivate
            them. Their agent assignments stay as they are.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={updateUser.isPending}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={updateUser.isPending}
            onClick={() => handleUpdate({ status: 'deactivated' }, `${member.name} was deactivated.`)}
          >
            {updateUser.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
