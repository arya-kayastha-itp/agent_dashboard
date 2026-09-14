import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function HistoryChart({ history }) {
  const theme = useTheme();
  const data = history.map((row) => ({ date: format(new Date(row.updateDate), 'MMM d'), progress: row.progress, status: row.status }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="date" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
        >
          <Label
            value="Progress"
            angle={-90}
            position="insideLeft"
            style={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          />
        </YAxis>
        <Tooltip formatter={(v) => `${v}% complete`} />
        <Line type="monotone" dataKey="progress" name="Progress" stroke={theme.palette.primary.main} strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  );
}
