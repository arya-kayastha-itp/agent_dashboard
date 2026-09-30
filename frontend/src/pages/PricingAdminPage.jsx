import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccentMark from '../components/AccentMark';
import AddPricingForm from '../components/AddPricingForm';
import ErrorAlert from '../components/ErrorAlert';
import PricingTable from '../components/PricingTable';
import { usePricing } from '../hooks/usePricing';
import { usePageTitle } from '../hooks/usePageTitle';

export default function PricingAdminPage() {
  usePageTitle('Pricing');
  const { data: pricing, isLoading, isError, refetch } = usePricing();

  return (
    <Box>
      <Box sx={{ mb: 3.5, animation: 'g-rise 0.6s var(--g-ease) backwards' }}>
        <AccentMark />
        <Typography variant="h4">Model Pricing</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontWeight: 500 }}>
          What each AI model costs — this is how call costs and cost alerts get calculated.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, animation: 'g-rise 0.7s var(--g-ease) 0.1s backwards' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add a price
        </Typography>
        <AddPricingForm />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, animation: 'g-rise 0.7s var(--g-ease) 0.2s backwards' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Price history
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading pricing…</Typography>
          </Stack>
        )}
        {isError && <ErrorAlert onRetry={refetch}>Failed to load pricing.</ErrorAlert>}
        {pricing && pricing.length === 0 && <Alert severity="info">No pricing configured yet.</Alert>}
        {pricing && pricing.length > 0 && <PricingTable pricing={pricing} />}
      </Paper>
    </Box>
  );
}
