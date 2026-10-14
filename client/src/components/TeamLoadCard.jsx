import ChartCard from './ChartCard.jsx';

const TEAM_COLOR = {
  'Soporte Técnico': 'var(--series-3)',
  Infraestructura: 'var(--series-1)',
  Desarrollo: 'var(--series-4)',
  'Sin asignar': 'var(--status-neutral)',
};

// Carga por equipo: permite decidir si hay que redistribuir entre equipos.
export default function TeamLoadCard({ teams }) {
  const max = Math.max(1, ...teams.map((t) => t.tickets));
  return (
    <ChartCard
      title="Carga por equipo"
      subtitle="Pendientes, técnicos y promedio por técnico (un ticket con varios equipos cuenta en cada uno)"
      columns={[
        { key: 'team', label: 'Equipo' },
        { key: 'tickets', label: 'Pendientes' },
        { key: 'technicians', label: 'Técnicos' },
        { key: 'perTechnician', label: 'Por técnico' },
        { key: 'over7', label: '>7 d' },
      ]}
      rows={teams}
    >
      <ul className="team-list">
        {teams.map((t) => (
          <li key={t.team}>
            <div className="team-head">
              <span className="team-name">
                <i style={{ background: TEAM_COLOR[t.team] }} />
                {t.team}
              </span>
              <span className="team-nums">
                <b>{t.tickets}</b> pendientes
                {t.perTechnician != null && <> · {t.technicians} {t.technicians === 1 ? "técnico" : "técnicos"} · <b>{t.perTechnician}</b> por técnico</>}
              </span>
            </div>
            <div className="team-track">
              <span style={{ width: `${(t.tickets / max) * 100}%`, background: TEAM_COLOR[t.team] }} />
            </div>
            <div className={`team-foot ${t.over7 > 0 ? 'flagged' : ''}`}>{t.over7} con más de 7 días</div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
