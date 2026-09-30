import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Controller, useForm } from 'react-hook-form';
import { ALERT_TYPES, ALERT_TYPE_LABELS } from '../constants';
import { useAgents } from '../hooks/useAgents';
import { useUpsertThreshold } from '../hooks/useThresholds';
import InfoTooltip from './InfoTooltip';
import { useToast } from './ToastProvider';

const DEFAULT_VALUES = {
  agentId: '',
  alertType: 'expensive_call',
  thresholdValue: '',
  windowMinutes: '',
};

export default function ThresholdForm() {
  const { data: agents } = useAgents();
  const upsertThreshold = useUpsertThreshold();
  const showToast = useToast();
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: DEFAULT_VALUES });

  const alertType = watch('alertType');
  const needsWindow = alertType !== 'expensive_call';

  const onSubmit = async (values) => {
    try {
      await upsertThreshold.mutateAsync({
        agentId: values.agentId || null,
        alertType: values.alertType,
        thresholdValue: Number(values.thresholdValue),
        windowMinutes: needsWindow ? Number(values.windowMinutes) : null,
      });
      reset(DEFAULT_VALUES);
      showToast(`Rule saved: ${ALERT_TYPE_LABELS[values.alertType]}.`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.error?.message || 'Failed to save rule. Please try again.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
        <Controller
          name="agentId"
          control={control}
          render={({ field }) => (
            <TextField select label="Applies to" size="small" sx={{ minWidth: 200 }} {...field}>
              <MenuItem value="">All projects (default)</MenuItem>
              {agents?.map((agent) => (
                <MenuItem key={agent.id} value={agent.id}>
                  {agent.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Controller
          name="alertType"
          control={control}
          render={({ field }) => (
            <TextField select label="Alert type" size="small" sx={{ minWidth: 220 }} {...field}>
              {ALERT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {ALERT_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <TextField
          label={alertType === 'expensive_call' ? 'Limit ($ per call)' : 'Limit (% of calls)'}
          size="small"
          type="number"
          inputProps={{ step: '0.01', min: 0 }}
          required
          error={Boolean(errors.thresholdValue)}
          helperText={errors.thresholdValue?.type === 'min' ? 'Must be 0 or more' : ' '}
          {...register('thresholdValue', { required: true, min: 0 })}
        />

        {needsWindow && (
          <Stack direction="row" spacing={0.25} alignItems="center">
            <TextField
              label="Time window (minutes)"
              size="small"
              type="number"
              inputProps={{ step: '1', min: 1 }}
              required={needsWindow}
              error={Boolean(errors.windowMinutes)}
              helperText={errors.windowMinutes?.type === 'min' ? 'Must be at least 1 minute' : ' '}
              {...register('windowMinutes', { required: needsWindow, min: 1 })}
            />
            <InfoTooltip title="How far back to look when checking the failure rate — e.g. 60 minutes means 'in the last hour'." />
          </Stack>
        )}

        {/* Offset by the field-label height so the button lines up with the inputs. */}
        <Button type="submit" variant="contained" disabled={upsertThreshold.isPending} sx={{ mt: '26px' }}>
          {upsertThreshold.isPending ? 'Saving…' : 'Save Rule'}
        </Button>
      </Stack>
    </form>
  );
}
