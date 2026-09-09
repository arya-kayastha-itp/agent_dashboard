import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function HistoryChart({ history }) {
  const theme = useTheme();
  const data = history.map((row) => ({ date: format(new Date(row.updateDate), 'MMM d'), progress: row.progress, status: row.status }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(v) => `${v}% complete`} />
        <Line type="monotone" dataKey="progress" stroke={theme.palette.primary.main} strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  );
}
