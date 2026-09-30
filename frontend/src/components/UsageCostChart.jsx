import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { Bar, CartesianGrid, ComposedChart, Label, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../formatters';
import { chartAxisTick, chartTooltipProps } from './chartStyles';

export default function UsageCostChart({ summary }) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const secondSeries = theme.palette.secondary.main;
  const axisLabelStyle = { fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 700 };
  const data = summary.map((row) => ({
    day: format(new Date(row.day), 'MMM d'),
    cost: Number(row.cost),
    calls: row.calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ left: 8, right: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={theme.palette.garage.line2} vertical={false} />
        <XAxis dataKey="day" tick={chartAxisTick(theme)} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="cost"
          orientation="left"
          tickFormatter={(v) => formatCurrency(v, { precision: 0 })}
          tick={chartAxisTick(theme)}
          axisLine={false}
          tickLine={false}
        >
          <Label value="Cost" angle={-90} position="insideLeft" style={axisLabelStyle} />
        </YAxis>
        <YAxis yAxisId="calls" orientation="right" tick={chartAxisTick(theme)} axisLine={false} tickLine={false}>
          <Label value="Calls" angle={90} position="insideRight" style={axisLabelStyle} />
        </YAxis>
        <Tooltip
          formatter={(v, name) => (name === 'Cost' ? formatCurrency(v, { precision: 4 }) : v)}
          {...chartTooltipProps(theme)}
        />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, fontWeight: 700, color: theme.palette.text.secondary }} />
        <Bar yAxisId="cost" dataKey="cost" name="Cost" fill={accent} fillOpacity={0.85} radius={[6, 6, 2, 2]} maxBarSize={36} animationDuration={900} />
        <Line
          yAxisId="calls"
          dataKey="calls"
          name="Calls"
          type="monotone"
          stroke={secondSeries}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: secondSeries, stroke: theme.palette.background.paper, strokeWidth: 2 }}
          animationDuration={1400}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
