import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { STATUS_VALUES } from '../constants';

const DEFAULT_VALUES = {
  name: '',
  description: '',
  assignedTo: '',
  status: 'Not Started',
  eta: '',
  progress: 0,
  statusDescription: '',
};

export default function AgentForm({ formId, onSubmit }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: DEFAULT_VALUES });

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

        <TextField label="Assigned To" fullWidth {...register('assignedTo')} />

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
            label="ETA"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            {...register('eta')}
          />
        </Stack>

        <div>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Progress
          </Typography>
          <Controller
            name="progress"
            control={control}
            render={({ field }) => (
              <Slider
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                valueLabelDisplay="auto"
                step={5}
                min={0}
                max={100}
              />
            )}
          />
        </div>

        <TextField
          label="Status Description"
          fullWidth
          multiline
          minRows={2}
          {...register('statusDescription')}
        />
      </Stack>
    </form>
  );
}
