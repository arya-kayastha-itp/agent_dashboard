import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export default function ErrorAlert({ children, onRetry }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {children}
    </Alert>
  );
}
