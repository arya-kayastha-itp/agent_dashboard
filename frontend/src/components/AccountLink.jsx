import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { format } from 'date-fns';
import { useToast } from './ToastProvider';

// An invite or reset link the Agent Manager just created. It's always shown
// with a copy button, because email may not be set up — or may land in junk —
// and pasting it into Teams is the fallback.
export default function AccountLink({ link, name, email }) {
  const showToast = useToast();
  const firstName = name.split(' ')[0];
  const isInvite = link.purpose === 'invite';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      showToast('Link copied.', 'success');
    } catch {
      showToast("Couldn't copy automatically — select the link and copy it.", 'error');
    }
  };

  return (
    <Stack spacing={2.25}>
      <Alert severity={link.emailed ? 'success' : 'info'}>
        {link.emailed
          ? `${isInvite ? 'Invite' : 'Reset link'} emailed to ${email}. You can also send ${firstName} the link below.`
          : `Email isn't set up yet, so send ${firstName} this link yourself — in Teams, for example.`}
      </Alert>
      <TextField
        label={isInvite ? 'Invite link' : 'Password reset link'}
        value={link.url}
        fullWidth
        onFocus={(event) => event.target.select()}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Copy link">
                <IconButton edge="end" aria-label="Copy link" onClick={copyLink}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
      <Typography variant="body2" color="text.secondary">
        Works once and expires {format(new Date(link.expiresAt), "d MMM 'at' HH:mm")}. Only share it with {firstName} — anyone with
        the link can set the password.
      </Typography>
    </Stack>
  );
}
