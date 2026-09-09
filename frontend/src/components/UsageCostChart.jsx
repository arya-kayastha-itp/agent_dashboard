import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../formatters';

export default function UsageCostChart({ summary }) {
  const theme = useTheme();
  const data = summary.map((row) => ({
    day: format(new Date(row.day), 'MMM d'),
    cost: Number(row.cost),
    calls: row.calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis yAxisId="cost" orientation="left" tickFormatter={(v) => formatCurrency(v, { precision: 0 })} />
        <YAxis yAxisId="calls" orientation="right" />
        <Tooltip formatter={(v, name) => (name === 'Cost' ? formatCurrency(v, { precision: 4 }) : v)} />
        <Bar yAxisId="cost" dataKey="cost" name="Cost" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
        <Line yAxisId="calls" dataKey="calls" name="Calls" type="monotone" stroke={theme.palette.text.secondary} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
