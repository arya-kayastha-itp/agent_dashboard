import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Tooltip from '@mui/material/Tooltip';

// Muted tones that all keep white initials above 4.5:1 contrast. Picked per
// name so the same person always gets the same colour.
const AVATAR_COLORS = ['#b0551f', '#2a70b3', '#1f7a5a', '#8a3b6b', '#5a6275'];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// A single person's initials badge — decorative next to their printed name.
export function PersonAvatar({ name, size = 28 }) {
  return (
    <Avatar
      aria-hidden="true"
      sx={{ width: size, height: size, fontSize: Math.round(size * 0.36), fontWeight: 800, bgcolor: colorFor(name), color: '#ffffff' }}
    >
      {initialsFor(name)}
    </Avatar>
  );
}

// Initials badges for an agent's assignees. Decorative next to the names the
// caller already prints, so they're hidden from assistive tech.
export default function AssigneeAvatars({ agent, size = 24, max = 3 }) {
  const assignees = agent?.assignees || [];
  if (assignees.length === 0) return null;

  return (
    <AvatarGroup
      max={max}
      aria-hidden="true"
      sx={{
        flexShrink: 0,
        '& .MuiAvatar-root': {
          width: size,
          height: size,
          fontSize: Math.round(size * 0.36),
          fontWeight: 800,
          borderColor: 'background.paper',
        },
      }}
    >
      {assignees.map((assignee) => (
        <Tooltip key={assignee.id} title={assignee.name}>
          <Avatar sx={{ bgcolor: colorFor(assignee.name), color: '#ffffff' }}>{initialsFor(assignee.name)}</Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
}
