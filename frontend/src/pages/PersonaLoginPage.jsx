import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth.api';
import AuthLayout from '../components/AuthLayout';
import PasswordField from '../components/PasswordField';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePersona } from '../persona/PersonaContext';

export default function PersonaLoginPage() {
  usePageTitle('Sign in');
  const { setSession } = usePersona();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginError, setLoginError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  const onSubmit = async ({ email, password }) => {
    try {
      const session = await login(email, password);
      setLoginError(null);
      setSession(session);
      const redirectTo = location.state?.from?.pathname ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setLoginError(err?.response?.data?.error?.message || 'Invalid email or password.');
    }
  };

  return (
    <AuthLayout title="Sign in">
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2.5}>
          {loginError && <Alert severity="error">{loginError}</Alert>}

          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            fullWidth
            error={Boolean(errors.email)}
            helperText={errors.email ? 'Email is required' : ' '}
            {...register('email', { required: true })}
          />

          <PasswordField
            label="Password"
            autoComplete="current-password"
            required
            fullWidth
            error={Boolean(errors.password)}
            helperText={errors.password ? 'Password is required' : ' '}
            {...register('password', { required: true })}
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ alignSelf: 'center', fontWeight: 600 }}>
            Forgot password?
          </Link>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
