import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth.api';
import AuthLayout from '../components/AuthLayout';
import { usePageTitle } from '../hooks/usePageTitle';

const backToSignIn = (
  <Link component={RouterLink} to="/login" variant="body2" sx={{ alignSelf: 'center', fontWeight: 600 }}>
    Back to sign in
  </Link>
);

export default function ForgotPasswordPage() {
  usePageTitle('Forgot password');
  const [sentTo, setSentTo] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    try {
      await requestPasswordReset(email);
      setRequestError(null);
      setSentTo(email);
    } catch {
      setRequestError('Something went wrong. Please try again.');
    }
  };

  // The server answers the same way whether or not the email has an account,
  // so this message has to cover both.
  if (sentTo) {
    return (
      <AuthLayout title="Check your email">
        <Stack spacing={2.5}>
          <Alert severity="success">
            If {sentTo} has an account, a link to set a new password is on its way. It expires in 1 hour.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Nothing arrived? Check your junk folder — it comes from an Azure address — or ask your Agent Manager to send you a link.
          </Typography>
          {backToSignIn}
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password">
      <Typography color="text.secondary" sx={{ mt: -2, mb: 3, fontWeight: 500 }}>
        Enter your work email and we'll send you a link to set a new password.
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2.5}>
          {requestError && <Alert severity="error">{requestError}</Alert>}

          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            fullWidth
            error={Boolean(errors.email)}
            helperText={errors.email ? 'Email is required' : ' '}
            {...register('email', { required: true })}
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send link'}
          </Button>

          {backToSignIn}
        </Stack>
      </Box>
    </AuthLayout>
  );
}
