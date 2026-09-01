import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function HistoryChart({ history }) {
  const data = history.map((row) => ({ date: row.updateDate, progress: row.progress, status: row.status }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Line type="monotone" dataKey="progress" stroke="#1976d2" strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  );
}
