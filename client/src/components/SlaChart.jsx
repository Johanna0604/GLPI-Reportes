import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard.jsx';

const COLORS = {
  'Dentro de SLA': 'var(--status-good)',
  'SLA incumplido': 'var(--status-critical)',
  'En curso (dentro de plazo)': 'var(--status-warning)',
  'Sin SLA': 'var(--status-neutral)',
};

export default function SlaChart({ data, loading, error }) {
  const rows = data?.data || [];
  const chartData = rows.map((r) => ({ ...r, fill: COLORS[r.label] }));
  const rate = data?.complianceRate;

  return (
    <ChartCard
      title="Cumplimiento de SLA"
      subtitle={rate != null ? `${rate}% de cumplimiento (tickets evaluados)` : 'Sin tickets con SLA evaluable en el rango'}
      loading={loading}
      error={error}
      empty={!loading && !error && rows.length === 0}
      columns={[{ key: 'label', label: 'Estado SLA' }, { key: 'count', label: 'Tickets' }]}
      rows={rows}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid-line)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={56} />
          <YAxis stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
            cursor={{ fill: 'var(--grid-line)', opacity: 0.4 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
