import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard.jsx';

const TOP_N = 8;

function topNWithOther(rows, nameKey) {
  if (rows.length <= TOP_N) return rows;
  const top = rows.slice(0, TOP_N);
  const rest = rows.slice(TOP_N).reduce((sum, r) => sum + r.count, 0);
  return [...top, { [nameKey]: 'Otros', count: rest }];
}

export default function RankedBarChart({ title, nameKey, data, loading, error, columnLabel }) {
  const allRows = data?.data || [];
  const rows = topNWithOther(allRows, nameKey);
  const height = Math.max(220, rows.length * 34 + 40);

  return (
    <ChartCard
      title={title}
      subtitle={data ? `${data.total} tickets en el rango` : undefined}
      loading={loading}
      error={error}
      empty={!loading && !error && allRows.length === 0}
      columns={[{ key: nameKey, label: columnLabel }, { key: 'count', label: 'Tickets' }]}
      rows={allRows}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid-line)" horizontal={false} />
          <XAxis type="number" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey={nameKey}
            stroke="var(--axis-line)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            width={140}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
            cursor={{ fill: 'var(--grid-line)', opacity: 0.4 }}
          />
          <Bar dataKey="count" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
