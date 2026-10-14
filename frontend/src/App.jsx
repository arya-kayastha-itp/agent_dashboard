import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import { Route, Routes, useLocation } from 'react-router-dom';
import AddAgentModal from './components/AddAgentModal';
import AddTeamMemberModal from './components/AddTeamMemberModal';
import Sidebar from './components/Sidebar';
import AgentDetailPage from './pages/AgentDetailPage';
import AllAgentsPage from './pages/AllAgentsPage';
import DailyUpdateSheetPage from './pages/DailyUpdateSheetPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import PersonaLoginPage from './pages/PersonaLoginPage';
import PortfolioInsightsPage from './pages/PortfolioInsightsPage';
import PricingAdminPage from './pages/PricingAdminPage';
import ReviewInboxPage from './pages/ReviewInboxPage';
import SetPasswordPage from './pages/SetPasswordPage';
import TeamsPage from './pages/TeamsPage';
import ThresholdsAdminPage from './pages/ThresholdsAdminPage';
import { navItemFor } from './persona/navConfig';
import { usePersona } from './persona/PersonaContext';
import { canAddAgent } from './persona/permissions';
import RequirePersona from './persona/RequirePersona';
import RequirePersonaRoute from './persona/RequirePersonaRoute';
import { useState } from 'react';

function restricted(path, element) {
  return (
    <RequirePersonaRoute allowed={navItemFor(path).visibleTo}>
      {element}
    </RequirePersonaRoute>
  );
}

export default function App({ onToggleTheme, themeMode }) {
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const { persona } = usePersona();
  // The floating action button adds whatever the current page is a list of.
  const onTeamsPage = useLocation().pathname === '/teams';

  return (
    <Box>
      <Routes>
        <Route path="/login" element={<PersonaLoginPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/*"
          element={
            <RequirePersona>
              <Box sx={{ display: 'flex' }}>
                <Sidebar onToggleTheme={onToggleTheme} themeMode={themeMode} />

                <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
                  {/* Extra bottom room when the floating Add button is present, so it never covers the last row. */}
                  <Container
                    maxWidth={false}
                    sx={{ pt: { xs: 8, md: 3.5 }, pb: canAddAgent(persona) ? 11 : 4, px: { xs: 2, md: 4.5 } }}
                  >
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/agents" element={<AllAgentsPage />} />
                      <Route path="/marketplace" element={restricted('/marketplace', <MarketplacePage />)} />
                      <Route path="/insights" element={restricted('/insights', <PortfolioInsightsPage />)} />
                      <Route path="/daily-sheet" element={restricted('/daily-sheet', <DailyUpdateSheetPage />)} />
                      <Route path="/teams" element={restricted('/teams', <TeamsPage />)} />
                      <Route path="/review" element={restricted('/review', <ReviewInboxPage />)} />
                      <Route path="/agents/:id" element={<AgentDetailPage />} />
                      <Route path="/finops/pricing" element={restricted('/finops/pricing', <PricingAdminPage />)} />
                      <Route path="/finops/thresholds" element={restricted('/finops/thresholds', <ThresholdsAdminPage />)} />
                    </Routes>
                  </Container>
                </Box>
              </Box>

              {canAddAgent(persona) && (
                <Fab
                  variant="extended"
                  color="primary"
                  onClick={() => (onTeamsPage ? setAddMemberOpen(true) : setAddAgentOpen(true))}
                  sx={{
                    position: 'fixed',
                    bottom: { xs: 16, md: 24 },
                    right: { xs: 16, md: 28 },
                    animation: 'g-pop 0.6s var(--g-ease) 0.5s backwards',
                  }}
                >
                  <AddIcon sx={{ mr: 1 }} />
                  {onTeamsPage ? 'Add Member' : 'Add Agent'}
                </Fab>
              )}

              <AddAgentModal open={addAgentOpen} onClose={() => setAddAgentOpen(false)} />
              <AddTeamMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
            </RequirePersona>
          }
        />
      </Routes>
    </Box>
  );
}
