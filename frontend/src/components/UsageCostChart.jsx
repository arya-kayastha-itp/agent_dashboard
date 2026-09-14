import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { Bar, CartesianGrid, ComposedChart, Label, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../formatters';

export default function UsageCostChart({ summary }) {
  const theme = useTheme();
  const data = summary.map((row) => ({
    day: format(new Date(row.day), 'MMM d'),
    cost: Number(row.cost),
    calls: row.calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ left: 8, right: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="day" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        <YAxis
          yAxisId="cost"
          orientation="left"
          tickFormatter={(v) => formatCurrency(v, { precision: 0 })}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
        >
          <Label value="Cost" angle={-90} position="insideLeft" style={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        </YAxis>
        <YAxis
          yAxisId="calls"
          orientation="right"
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
        >
          <Label value="Calls" angle={90} position="insideRight" style={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        </YAxis>
        <Tooltip formatter={(v, name) => (name === 'Cost' ? formatCurrency(v, { precision: 4 }) : v)} />
        <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="cost" dataKey="cost" name="Cost" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
        <Line yAxisId="calls" dataKey="calls" name="Calls" type="monotone" stroke={theme.palette.text.secondary} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
