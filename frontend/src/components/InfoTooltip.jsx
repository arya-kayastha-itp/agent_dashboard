import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

export default function InfoTooltip({ title }) {
  return (
    <Tooltip title={title} arrow>
      <IconButton size="small" aria-label={title} sx={{ p: 0.25 }}>
        <InfoOutlinedIcon fontSize="inherit" sx={{ fontSize: 16, color: 'text.secondary' }} />
      </IconButton>
    </Tooltip>
  );
}
