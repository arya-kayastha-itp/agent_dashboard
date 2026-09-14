import AddIcon from '@mui/icons-material/Add';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AddAgentModal from './components/AddAgentModal';
import AlertBell from './components/AlertBell';
import { PERSONA_LABELS } from './labels';
import AgentDetailPage from './pages/AgentDetailPage';
import DailyUpdateSheetPage from './pages/DailyUpdateSheetPage';
import DashboardPage from './pages/DashboardPage';
import FinOpsPage from './pages/FinOpsPage';
import PersonaLoginPage from './pages/PersonaLoginPage';
import PricingAdminPage from './pages/PricingAdminPage';
import ThresholdsAdminPage from './pages/ThresholdsAdminPage';
import { NAV_ITEMS, SHOW_ALERT_BELL, navItemFor } from './persona/navConfig';
import { usePersona } from './persona/PersonaContext';
import { canAddAgent } from './persona/permissions';
import RequirePersona from './persona/RequirePersona';
import RequirePersonaRoute from './persona/RequirePersonaRoute';

function restricted(path, element) {
  return (
    <RequirePersonaRoute allowed={navItemFor(path).visibleTo}>
      {element}
    </RequirePersonaRoute>
  );
}

export default function App() {
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const { persona, clearPersona } = usePersona();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitchPersona = () => {
    clearPersona();
    navigate('/login');
  };

  return (
    <Box>
      <Routes>
        <Route path="/login" element={<PersonaLoginPage />} />
        <Route
          path="/*"
          element={
            <RequirePersona>
              <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Toolbar>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    component={Link}
                    to="/"
                    sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Box component="img" src="/favicon.svg" alt="" aria-hidden="true" sx={{ width: 26, height: 26 }} />
                    <Typography variant="h6">Agent Dashboard</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {NAV_ITEMS.filter((item) => item.visibleTo.includes(persona)).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          component={Link}
                          to={item.path}
                          color={isActive ? 'primary' : 'inherit'}
                          aria-current={isActive ? 'page' : undefined}
                          sx={{
                            fontWeight: isActive ? 600 : 400,
                            borderRadius: 0,
                            borderBottom: 2,
                            borderColor: isActive ? 'primary.main' : 'transparent',
                          }}
                        >
                          {item.label}
                        </Button>
                      );
                    })}
                    {SHOW_ALERT_BELL.includes(persona) && <AlertBell />}
                    <Chip
                      label={`${PERSONA_LABELS[persona]} · Switch`}
                      onClick={handleSwitchPersona}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </Toolbar>
              </AppBar>

              <Container sx={{ py: 4 }}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/daily-sheet" element={restricted('/daily-sheet', <DailyUpdateSheetPage />)} />
                  <Route path="/agents/:id" element={<AgentDetailPage />} />
                  <Route path="/finops" element={restricted('/finops', <FinOpsPage />)} />
                  <Route path="/finops/pricing" element={restricted('/finops/pricing', <PricingAdminPage />)} />
                  <Route path="/finops/thresholds" element={restricted('/finops/thresholds', <ThresholdsAdminPage />)} />
                </Routes>
              </Container>

              {canAddAgent(persona) && (
                <Fab
                  variant="extended"
                  color="primary"
                  onClick={() => setAddAgentOpen(true)}
                  sx={{ position: 'fixed', bottom: 24, right: 24 }}
                >
                  <AddIcon sx={{ mr: 1 }} />
                  Add Agent
                </Fab>
              )}

              <AddAgentModal open={addAgentOpen} onClose={() => setAddAgentOpen(false)} />
            </RequirePersona>
          }
        />
      </Routes>
    </Box>
  );
}
