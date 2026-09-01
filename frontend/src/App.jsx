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
import AgentDetailPage from './pages/AgentDetailPage';
import DailyUpdateSheetPage from './pages/DailyUpdateSheetPage';
import DashboardPage from './pages/DashboardPage';

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
          </Stack>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/daily-sheet" element={<DailyUpdateSheetPage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
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
