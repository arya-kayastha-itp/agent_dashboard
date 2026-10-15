import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { STATUS_VALUES } from '../constants';
import { FIELD_LABELS } from '../labels';
import { openNativePicker } from '../nativePicker';
import AssigneeSelect from './AssigneeSelect';
import MarketplaceToggle from './MarketplaceToggle';
import ProgressSlider from './ProgressSlider';

const DEFAULT_VALUES = {
  name: '',
  description: '',
  assigneeIds: [],
  marketplaceDeployment: false,
  status: 'Not Started',
  eta: '',
  progress: 0,
  statusDescription: '',
  blockerReason: '',
  blockedBy: '',
};

export default function AgentForm({ formId, onSubmit }) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: DEFAULT_VALUES });
  const status = useWatch({ control, name: 'status' });
  // A new agent that starts out Blocked needs the same details as any other.
  const requiredIfBlocked = (value) => getValues('status') !== 'Blocked' || value.trim().length > 0;

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          label="Name"
          required
          fullWidth
          error={Boolean(errors.name)}
          helperText={errors.name ? 'Name is required' : ''}
          {...register('name', { required: true })}
        />

        <TextField label="Description" fullWidth multiline minRows={2} {...register('description')} />

        <Controller
          name="assigneeIds"
          control={control}
          render={({ field }) => <AssigneeSelect value={field.value} onChange={field.onChange} />}
        />

        <Controller
          name="marketplaceDeployment"
          control={control}
          render={({ field }) => <MarketplaceToggle value={field.value} onChange={field.onChange} />}
        />

        <Stack direction="row" spacing={2}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField select label="Status" fullWidth {...field}>
                {STATUS_VALUES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <TextField
            label={FIELD_LABELS.eta}
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ onClick: openNativePicker }}
            {...register('eta')}
          />
        </Stack>

        {status === 'Blocked' && (
          <Stack spacing={1.5}>
            <TextField
              label="Why is it blocked?"
              required
              fullWidth
              multiline
              error={Boolean(errors.blockerReason)}
              helperText={errors.blockerReason ? 'Say why it’s blocked' : ''}
              {...register('blockerReason', { validate: requiredIfBlocked })}
            />
            <TextField
              label="Who or what can unblock it?"
              placeholder="A person, team or dependency"
              required
              fullWidth
              error={Boolean(errors.blockedBy)}
              helperText={errors.blockedBy ? 'Say who or what can unblock it' : ''}
              {...register('blockedBy', { validate: requiredIfBlocked })}
            />
          </Stack>
        )}

        <div>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.4, mb: 0.75 }}>
            Progress
          </Typography>
          <Controller
            name="progress"
            control={control}
            render={({ field }) => <ProgressSlider value={field.value} onChange={field.onChange} />}
          />
        </div>

        <TextField
          label={FIELD_LABELS.statusDescription}
          helperText="What's happening, in plain language"
          fullWidth
          multiline
          minRows={2}
          {...register('statusDescription')}
        />
      </Stack>
    </form>
  );
}
