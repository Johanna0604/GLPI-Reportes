import { Bar, BarChart, Cell, CartesianGrid, LabelList, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard.jsx';

// Hasta 7 días en azul; desde 8 días en rojo (alerta de la mesa de ayuda).
const OLD = new Set(['8-15', '16-30', '30+']);

export default function AgeBucketsChart({ buckets }) {
  return (
    <ChartCard
      title="Pendientes por antigüedad"
      subtitle="Días desde la apertura · rojo = más de 7 días"
      columns={[{ key: 'label', label: 'Antigüedad' }, { key: 'count', label: 'Tickets' }]}
      rows={buckets}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={buckets} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid-line)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
            cursor={{ fill: 'var(--grid-line)', opacity: 0.4 }}
            formatter={(v) => [v, 'Tickets']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {buckets.map((b) => (
              <Cell key={b.key} fill={OLD.has(b.key) ? 'var(--status-critical)' : 'var(--series-1)'} />
            ))}
            <LabelList dataKey="count" position="top" fill="var(--text-primary)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
