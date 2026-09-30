import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm } from 'react-hook-form';
import { useCreatePricing } from '../hooks/usePricing';
import { openNativePicker } from '../nativePicker';
import { useToast } from './ToastProvider';

const DEFAULT_VALUES = {
  model: '',
  inputPricePer1kTokens: '',
  outputPricePer1kTokens: '',
  effectiveFrom: '',
};

export default function AddPricingForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: DEFAULT_VALUES });
  const createPricing = useCreatePricing();
  const showToast = useToast();

  const onSubmit = async (values) => {
    try {
      await createPricing.mutateAsync({
        model: values.model,
        inputPricePer1kTokens: Number(values.inputPricePer1kTokens),
        outputPricePer1kTokens: Number(values.outputPricePer1kTokens),
        effectiveFrom: values.effectiveFrom || undefined,
      });
      reset(DEFAULT_VALUES);
      showToast(`Price for "${values.model}" saved.`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to save price. Please try again.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <TextField
          label="Model"
          size="small"
          required
          error={Boolean(errors.model)}
          {...register('model', { required: true })}
        />
        <TextField
          label="Cost per 1,000 calls (in)"
          size="small"
          type="number"
          inputProps={{ step: '0.0001', min: 0 }}
          required
          error={Boolean(errors.inputPricePer1kTokens)}
          helperText={errors.inputPricePer1kTokens?.type === 'min' ? 'Must be 0 or more' : ' '}
          {...register('inputPricePer1kTokens', { required: true, min: 0 })}
        />
        <TextField
          label="Cost per 1,000 calls (out)"
          size="small"
          type="number"
          inputProps={{ step: '0.0001', min: 0 }}
          required
          error={Boolean(errors.outputPricePer1kTokens)}
          helperText={errors.outputPricePer1kTokens?.type === 'min' ? 'Must be 0 or more' : ' '}
          {...register('outputPricePer1kTokens', { required: true, min: 0 })}
        />
        <TextField
          label="Starting from"
          size="small"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          inputProps={{ onClick: openNativePicker }}
          {...register('effectiveFrom')}
        />
        {/* Offset by the field-label height so the button lines up with the inputs. */}
        <Button type="submit" variant="contained" disabled={createPricing.isPending} sx={{ mt: '26px' }}>
          {createPricing.isPending ? 'Adding…' : 'Add Price'}
        </Button>
      </Stack>
    </form>
  );
}
