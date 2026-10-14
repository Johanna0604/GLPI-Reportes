import ChartCard from './ChartCard.jsx';

const STATE_COLOR = {
  1: 'var(--series-5)',
  2: 'var(--series-1)',
  3: 'var(--series-7)',
  4: 'var(--series-4)',
};

// Pendientes por estado: la fila "En espera" muestra cuánto está detenido.
// Debajo, los resueltos que aún no se cierran (cierre pendiente de la mesa).
export default function StatesCard({ states, resolvedPending }) {
  const total = states.reduce((s, r) => s + r.count, 0);
  return (
    <ChartCard
      title="Pendientes por estado"
      subtitle="Dónde está el trabajo: en atención, detenido o por cerrar"
      columns={[
        { key: 'label', label: 'Estado' },
        { key: 'count', label: 'Tickets' },
        { key: 'pct', label: '%' },
        { key: 'maxDays', label: 'Más antiguo (d)' },
        { key: 'over7', label: '>7 d' },
      ]}
      rows={states}
    >
      <div className="stack" role="img" aria-label="Distribución de pendientes por estado">
        {states.filter((r) => r.count > 0).map((r) => (
          <span key={r.statusId} style={{ width: `${(r.count / Math.max(1, total)) * 100}%`, background: STATE_COLOR[r.statusId] }} />
        ))}
      </div>
      <ul className="state-list">
        {states.map((r) => (
          <li key={r.statusId}>
            <i style={{ background: STATE_COLOR[r.statusId] }} />
            <span className="state-name">{r.label}</span>
            <span className="state-count">{r.count}</span>
            <span className="state-pct">{r.pct}%</span>
            <span className={`state-old ${r.maxDays > 7 ? 'flagged' : ''}`}>{r.count ? `máx ${r.maxDays} d` : '—'}</span>
          </li>
        ))}
      </ul>
      <div className={`closing tile-${resolvedPending.tone}`}>
        <b>{resolvedPending.count}</b> resueltos sin cerrar
        <span>
          {resolvedPending.over3 > 0
            ? `${resolvedPending.over3} llevan más de 3 días sin movimiento: confirmar cierre`
            : 'Ninguno lleva más de 3 días sin movimiento'}
        </span>
      </div>
    </ChartCard>
  );
}
