import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard.jsx';

// Orden fijo (no depende de qué estados estén presentes en los datos) para
// que el color de cada estado nunca cambie al filtrar.
const STATUS_ORDER = [
  { label: 'Nuevo', color: 'var(--series-4)' },
  { label: 'En curso (asignado)', color: 'var(--series-1)' },
  { label: 'En curso (planificado)', color: 'var(--series-3)' },
  { label: 'En espera', color: 'var(--series-5)' },
  { label: 'Resuelto', color: 'var(--series-6)' },
  { label: 'Cerrado', color: 'var(--text-muted)' },
];

function colorFor(status) {
  return STATUS_ORDER.find((s) => s.label === status)?.color || 'var(--series-2)';
}

export default function StatusChart({ loading, error, data }) {
  const rows = data?.data || [];
  const chartData = rows.map((r) => ({ ...r, fill: colorFor(r.status) }));

  return (
    <ChartCard
      title="Tickets por estado"
      subtitle={data ? `${data.total} tickets en el rango` : undefined}
      loading={loading}
      error={error}
      empty={!loading && !error && rows.length === 0}
      columns={[{ key: 'status', label: 'Estado' }, { key: 'count', label: 'Tickets' }]}
      rows={rows}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid-line)" vertical={false} />
          <XAxis dataKey="status" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
          <YAxis stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
            cursor={{ fill: 'var(--grid-line)', opacity: 0.4 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
