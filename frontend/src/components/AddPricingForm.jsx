import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm } from 'react-hook-form';
import { useCreatePricing } from '../hooks/usePricing';

const DEFAULT_VALUES = {
  model: '',
  inputPricePer1kTokens: '',
  outputPricePer1kTokens: '',
  effectiveFrom: '',
};

export default function AddPricingForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: DEFAULT_VALUES });
  const createPricing = useCreatePricing();

  const onSubmit = async (values) => {
    await createPricing.mutateAsync({
      model: values.model,
      inputPricePer1kTokens: Number(values.inputPricePer1kTokens),
      outputPricePer1kTokens: Number(values.outputPricePer1kTokens),
      effectiveFrom: values.effectiveFrom || undefined,
    });
    reset(DEFAULT_VALUES);
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
          {...register('inputPricePer1kTokens', { required: true, min: 0 })}
        />
        <TextField
          label="Cost per 1,000 calls (out)"
          size="small"
          type="number"
          inputProps={{ step: '0.0001', min: 0 }}
          required
          error={Boolean(errors.outputPricePer1kTokens)}
          {...register('outputPricePer1kTokens', { required: true, min: 0 })}
        />
        <TextField label="Starting from" size="small" type="datetime-local" InputLabelProps={{ shrink: true }} {...register('effectiveFrom')} />
        <Button type="submit" variant="contained" disabled={createPricing.isPending}>
          Add Price
        </Button>
      </Stack>
    </form>
  );
}
