import AddIcon from '@mui/icons-material/Add';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import AddAgentModal from './components/AddAgentModal';
import AlertBell from './components/AlertBell';
import AgentDetailPage from './pages/AgentDetailPage';
import DailyUpdateSheetPage from './pages/DailyUpdateSheetPage';
import DashboardPage from './pages/DashboardPage';
import FinOpsPage from './pages/FinOpsPage';
import PricingAdminPage from './pages/PricingAdminPage';
import ThresholdsAdminPage from './pages/ThresholdsAdminPage';

export default function App() {
  const [addAgentOpen, setAddAgentOpen] = useState(false);

  return (
    <Box>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Agent Dashboard
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button component={Link} to="/">
              Dashboard
            </Button>
            <Button component={Link} to="/daily-sheet">
              Daily Update Sheet
            </Button>
            <Button component={Link} to="/finops">
              Cost &amp; Reliability
            </Button>
            <Button component={Link} to="/finops/pricing">
              Pricing
            </Button>
            <Button component={Link} to="/finops/thresholds">
              Alert Rules
            </Button>
            <AlertBell />
          </Stack>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/daily-sheet" element={<DailyUpdateSheetPage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
          <Route path="/finops" element={<FinOpsPage />} />
          <Route path="/finops/pricing" element={<PricingAdminPage />} />
          <Route path="/finops/thresholds" element={<ThresholdsAdminPage />} />
        </Routes>
      </Container>

      <Fab
        variant="extended"
        color="primary"
        onClick={() => setAddAgentOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon sx={{ mr: 1 }} />
        Add Agent
      </Fab>

      <AddAgentModal open={addAgentOpen} onClose={() => setAddAgentOpen(false)} />
    </Box>
  );
}
