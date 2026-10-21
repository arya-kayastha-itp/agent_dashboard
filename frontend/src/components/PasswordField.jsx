import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';

// A password box with an eye button that shows what's been typed — so a
// typo in a new password doesn't go unnoticed. Takes the same props as
// TextField, including what react-hook-form's register() returns.
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Hide password' : 'Show password';

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={label}>
              <IconButton
                edge="end"
                aria-label={label}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
                // Keeps focus (and the caret) in the field.
                onMouseDown={(event) => event.preventDefault()}
              >
                {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}
