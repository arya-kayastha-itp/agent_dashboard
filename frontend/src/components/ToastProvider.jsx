import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { alpha } from '@mui/material/styles';
import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

// Message/severity and open/closed are separate state so the Snackbar's exit
// transition still has text to fade out instead of unmounting the Alert.
export function ToastProvider({ children }) {
  const [{ message, severity }, setContent] = useState({ message: '', severity: 'success' });
  const [open, setOpen] = useState(false);

  const showToast = useCallback((text, toastSeverity = 'success') => {
    setContent({ message: text, severity: toastSeverity });
    setOpen(true);
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar open={open} autoHideDuration={4000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={(theme) => {
            const main = theme.palette[severity]?.main ?? theme.palette.info.main;
            return {
              width: '100%',
              minWidth: 320,
              alignItems: 'center',
              borderRadius: '16px',
              color: 'text.primary',
              bgcolor: `color-mix(in srgb, ${main} 16%, ${theme.palette.garage.surface3})`,
              border: `1px solid ${alpha(main, 0.4)}`,
              boxShadow: '0 24px 50px -20px rgba(0, 0, 0, 0.85)',
              fontWeight: 700,
              '& .MuiAlert-icon': { color: main },
              '& .MuiAlert-action': { color: 'text.secondary' },
            };
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error('useToast must be used within a ToastProvider');
  return showToast;
}
