import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddPricingForm from '../components/AddPricingForm';
import PricingTable from '../components/PricingTable';
import { usePricing } from '../hooks/usePricing';

export default function PricingAdminPage() {
  const { data: pricing, isLoading, isError } = usePricing();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Model Pricing
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        What each AI model costs — this is how call costs and cost alerts get calculated.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add a price
        </Typography>
        <AddPricingForm />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Price history
        </Typography>

        {isLoading && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading pricing…</Typography>
          </Stack>
        )}
        {isError && <Alert severity="error">Failed to load pricing.</Alert>}
        {pricing && pricing.length === 0 && <Alert severity="info">No pricing configured yet.</Alert>}
        {pricing && pricing.length > 0 && <PricingTable pricing={pricing} />}
      </Paper>
    </Box>
  );
}
