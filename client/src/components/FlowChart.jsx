import { Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard.jsx';

export default function FlowChart({ flow, totals, windowDays }) {
  const signed = totals.saldo > 0 ? `+${totals.saldo}` : String(totals.saldo);
  return (
    <ChartCard
      title={`Ingresos vs. cierres · últimos ${windowDays} días`}
      subtitle={`${totals.ingresados} ingresados · ${totals.cerrados} cerrados · saldo acumulado ${signed}`}
      columns={[
        { key: 'date', label: 'Fecha' },
        { key: 'ingresados', label: 'Ingresados' },
        { key: 'cerrados', label: 'Cerrados' },
        { key: 'saldo', label: 'Saldo acumulado' },
      ]}
      rows={flow}
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={flow} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid-line)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} interval="preserveStartEnd" minTickGap={24} />
          <YAxis yAxisId="day" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <YAxis yAxisId="net" orientation="right" stroke="var(--axis-line)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
          <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
          <Bar yAxisId="day" dataKey="ingresados" name="Ingresados" fill="var(--series-1)" maxBarSize={14} />
          <Bar yAxisId="day" dataKey="cerrados" name="Cerrados" fill="var(--series-3)" maxBarSize={14} />
          <Line yAxisId="net" type="linear" dataKey="saldo" name="Saldo acumulado" stroke="var(--series-2)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
