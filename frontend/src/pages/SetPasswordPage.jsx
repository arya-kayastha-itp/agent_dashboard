import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { describeLink, setPassword } from '../api/auth.api';
import AuthLayout from '../components/AuthLayout';
import { PASSWORD_MIN_LENGTH } from '../constants';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePersona } from '../persona/PersonaContext';

const errorMessage = (err, fallback) => err?.response?.data?.error?.message || fallback;

function DeadLink({ message }) {
  return (
    <Stack spacing={2.5}>
      <Alert severity="error">{message}</Alert>
      <Button component={RouterLink} to="/forgot-password" variant="contained" size="large">
        Request a new link
      </Button>
      <Link component={RouterLink} to="/login" variant="body2" sx={{ alignSelf: 'center', fontWeight: 600 }}>
        Back to sign in
      </Link>
    </Stack>
  );
}

// Where invite and password-reset links land: /set-password?token=…
export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = usePersona();
  const [submitError, setSubmitError] = useState(null);

  // Read the token once, then drop it from the address bar so it doesn't sit
  // in browser history or get copied along with the URL.
  const [token] = useState(() => searchParams.get('token') || '');
  useEffect(() => {
    if (searchParams.has('token')) navigate('/set-password', { replace: true });
  }, [searchParams, navigate]);

  const linkQuery = useQuery({
    queryKey: ['passwordLink', token],
    queryFn: () => describeLink(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });
  const link = linkQuery.data;
  const isReset = link?.purpose === 'reset';
  usePageTitle(isReset ? 'Reset password' : 'Set your password');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { password: '', confirm: '' } });

  const onSubmit = async ({ password }) => {
    try {
      setSession(await setPassword(token, password));
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitError(errorMessage(err, 'Could not save your password. Please try again.'));
    }
  };

  const title = isReset ? 'Reset password' : 'Set your password';

  if (!token) {
    return (
      <AuthLayout title={title}>
        <DeadLink message="This page needs the link from your invite or password-reset email." />
      </AuthLayout>
    );
  }

  if (linkQuery.isLoading) {
    return (
      <AuthLayout title={title}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography color="text.secondary">Checking your link…</Typography>
        </Stack>
      </AuthLayout>
    );
  }

  if (linkQuery.isError) {
    return (
      <AuthLayout title={title}>
        <DeadLink message={errorMessage(linkQuery.error, "This link isn't valid. Ask your Agent Manager for a new one.")} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title}>
      <Typography color="text.secondary" sx={{ mt: -2, mb: 3, fontWeight: 500 }}>
        {isReset ? 'Choose a new password' : `Hi ${link.name.split(' ')[0]} — choose a password`} for {link.email}.
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2.5}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {/* Lets password managers save the new password against the right account. */}
          <input type="email" name="username" autoComplete="username" value={link.email} readOnly hidden />

          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            fullWidth
            error={Boolean(errors.password)}
            helperText={errors.password ? errors.password.message : `At least ${PASSWORD_MIN_LENGTH} characters`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: PASSWORD_MIN_LENGTH, message: `Use at least ${PASSWORD_MIN_LENGTH} characters` },
            })}
          />

          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            fullWidth
            error={Boolean(errors.confirm)}
            helperText={errors.confirm ? errors.confirm.message : ' '}
            {...register('confirm', {
              required: 'Confirm your password',
              validate: (value) => value === getValues('password') || "Passwords don't match",
            })}
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isReset ? 'Reset password and sign in' : 'Set password and sign in'}
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
