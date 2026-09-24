import Box from '@mui/material/Box';
import PortfolioInsightsPanel from '../components/PortfolioInsightsPanel';
import { usePageTitle } from '../hooks/usePageTitle';

// Portfolio Insights used to sit inline at the top of the Executive's Home
// page, crowding the agent table underneath it. It now lives on its own
// page instead, full-width, same as it always looked.
export default function PortfolioInsightsPage() {
  usePageTitle('Portfolio Insights');

  return (
    <Box>
      <PortfolioInsightsPanel />
    </Box>
  );
}
