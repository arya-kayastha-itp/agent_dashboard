import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import IconButton from '@mui/material/IconButton';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AgentQueueRow from './AgentQueueRow';

// Wraps an AgentQueueRow as a dnd-kit sortable item. Dragging is confined to
// the grip handle so it doesn't fight the row's own click targets (name
// link, "Update" toggle, inline form controls). The row itself is a <tr>,
// so the sortable ref/style go directly onto it rather than onto a wrapper
// element — a <div> around a <tr> would get hoisted out of the table.
export default function SortableAgentRow({ agent }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : 'auto',
  };

  return (
    <AgentQueueRow
      agent={agent}
      rowRef={setNodeRef}
      rowStyle={style}
      dragHandle={
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          sx={{ cursor: 'grab', touchAction: 'none', color: 'text.disabled' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      }
    />
  );
}
