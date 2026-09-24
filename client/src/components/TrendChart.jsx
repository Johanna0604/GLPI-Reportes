import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard.jsx';

export default function TrendChart({ data, loading, error }) {
  const rows = data?.data || [];

  return (
    <ChartCard
      title="Volumen histórico de tickets"
      subtitle={data ? `Agrupado por ${data.granularity === 'month' ? 'mes' : 'semana'}` : undefined}
      loading={loading}
      error={error}
      empty={!loading && !error && rows.length === 0}
      columns={[
        { key: 'period', label: 'Periodo' },
        { key: 'abiertos', label: 'Abiertos' },
        { key: 'cerrados', label: 'Cerrados' },
      ]}
      rows={rows}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid-line)" vertical={false} />
          <XAxis dataKey="period" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
          />
          <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
          <Line type="monotone" dataKey="abiertos" name="Tickets abiertos" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="cerrados" name="Tickets cerrados" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
