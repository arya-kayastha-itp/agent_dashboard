import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocation, useNavigate } from 'react-router-dom';
import { PERSONA_VALUES } from '../constants';
import { usePageTitle } from '../hooks/usePageTitle';
import { PERSONA_DESCRIPTIONS, PERSONA_LABELS } from '../labels';
import { usePersona } from '../persona/PersonaContext';
import AiGarageLogo from '../components/AiGarageLogo';

export default function PersonaLoginPage() {
  usePageTitle('Choose persona');
  const { setPersona } = usePersona();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelect = (persona) => {
    setPersona(persona);
    const redirectTo = location.state?.from?.pathname ?? '/';
    navigate(redirectTo, { replace: true });
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <AiGarageLogo size={56} />
      </Box>
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
        Choose your persona to continue
      </Typography>

      <Stack spacing={2}>
        {PERSONA_VALUES.map((persona) => (
          <ButtonBase
            key={persona}
            onClick={() => handleSelect(persona)}
            sx={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: 1 }}
          >
            <Paper
              variant="outlined"
              sx={{ p: 2.5, width: '100%', transition: 'border-color 0.15s', '&:hover': { borderColor: 'primary.main' } }}
            >
              <Typography variant="h6">{PERSONA_LABELS[persona]}</Typography>
              <Typography variant="body2" color="text.secondary">
                {PERSONA_DESCRIPTIONS[persona]}
              </Typography>
            </Paper>
          </ButtonBase>
        ))}
      </Stack>

      <Box sx={{ mt: 4 }} />
    </Container>
  );
}
