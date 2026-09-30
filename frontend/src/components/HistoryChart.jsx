import { useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxisTick, chartTooltipProps } from './chartStyles';

export default function HistoryChart({ history }) {
  const theme = useTheme();
  // useId() contains colons, which aren't safe inside url(#…).
  const fillId = `history-fill-${useId().replace(/:/g, '')}`;
  const accent = theme.palette.primary.main;
  const data = history.map((row) => ({ date: format(new Date(row.updateDate), 'MMM d'), progress: row.progress, status: row.status }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: 12, right: 28, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={theme.palette.garage.line2} vertical={false} />
        <XAxis dataKey="date" tick={chartAxisTick(theme)} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={chartAxisTick(theme)} axisLine={false} tickLine={false}>
          <Label
            value="Progress"
            angle={-90}
            position="insideLeft"
            style={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 700 }}
          />
        </YAxis>
        <Tooltip formatter={(v) => `${v}% complete`} {...chartTooltipProps(theme)} />
        <Area
          type="monotone"
          dataKey="progress"
          name="Progress"
          stroke={accent}
          strokeWidth={2.5}
          fill={`url(#${fillId})`}
          dot={{ r: 3.5, fill: theme.palette.background.paper, stroke: accent, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: accent, stroke: theme.palette.background.paper, strokeWidth: 2 }}
          animationDuration={1400}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
