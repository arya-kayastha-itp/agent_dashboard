import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { FIELD_LABELS } from '../labels';

// Multi-select over the team roster — the only way to assign an agent, so
// assignee names can't be mistyped or drift apart. `value` is an array of
// team-member ids (what the API stores); the roster supplies the names.
export default function AssigneeSelect({ value, onChange }) {
  const { data: members = [], isLoading, isError } = useTeamMembers();
  const selected = members.filter((member) => value.includes(member.id));

  let helperText = 'Pick one or more team members. Manage the list on the Teams page.';
  if (isError) helperText = "Couldn't load team members. Close this and try again.";
  else if (!isLoading && members.length === 0) helperText = 'No team members yet. Add them on the Teams page first.';

  return (
    <Autocomplete
      multiple
      filterSelectedOptions
      options={members}
      value={selected}
      loading={isLoading}
      onChange={(_, next) => onChange(next.map((member) => member.id))}
      getOptionLabel={(member) => member.name}
      isOptionEqualToValue={(option, selectedOption) => option.id === selectedOption.id}
      noOptionsText="No matching team members"
      renderInput={(params) => (
        <TextField {...params} label={FIELD_LABELS.assignedTo} error={isError} helperText={helperText} />
      )}
    />
  );
}
