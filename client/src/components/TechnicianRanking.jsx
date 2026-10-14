import { useState } from 'react';
import ChartCard from './ChartCard.jsx';

const TEAM_COLOR = {
  'Soporte Técnico': 'var(--series-3)',
  Infraestructura: 'var(--series-1)',
  Desarrollo: 'var(--series-4)',
  'Sin asignar': 'var(--status-neutral)',
};

// Ranking de pendientes por técnico. Clic en una fila: sus 5 casos más antiguos.
export default function TechnicianRanking({ technicians }) {
  const [selected, setSelected] = useState(null);
  const max = Math.max(1, ...technicians.map((t) => t.count));
  const teams = [...new Set(technicians.map((t) => t.team))];
  const current = technicians.find((t) => t.technician === selected);

  return (
    <ChartCard
      title="Pendientes por técnico"
      subtitle="Color por equipo · rojo y +7d si su caso más antiguo supera 7 días · clic para ver sus 5 más antiguos"
      columns={[
        { key: 'technician', label: 'Técnico' },
        { key: 'team', label: 'Equipo' },
        { key: 'count', label: 'Pendientes' },
        { key: 'maxDays', label: 'Máx. días' },
      ]}
      rows={technicians}
    >
      <div className="legend">
        {teams.map((t) => (
          <span key={t} className="legend-item">
            <i style={{ background: TEAM_COLOR[t] }} />
            {t}
          </span>
        ))}
      </div>
      <ul className="rank-list">
        {technicians.map((t) => {
          const flagged = t.maxDays > 7;
          return (
            <li key={t.technician}>
              <button
                type="button"
                className={`rank-row ${selected === t.technician ? 'selected' : ''}`}
                onClick={() => setSelected(selected === t.technician ? null : t.technician)}
                aria-expanded={selected === t.technician}
              >
                <span className="rank-name">{t.technician}</span>
                <span className="rank-track">
                  <span className="rank-bar" style={{ width: `${(t.count / max) * 100}%`, background: TEAM_COLOR[t.team] }} />
                </span>
                <span className={`rank-value ${flagged ? 'flagged' : ''}`}>
                  {t.count} <small>(máx {t.maxDays}d)</small>
                  {flagged && <b> +7d</b>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {current && (
        <div className="drill">
          <h4>Más antiguos de {current.technician}</h4>
          {current.oldest.length === 0 ? (
            <p className="drill-empty">Sin casos listables (MODIF-DATOS / ELIM no se listan).</p>
          ) : (
            <ul>
              {current.oldest.map((o) => (
                <li key={o.id}>
                  <span className="drill-id">#{o.id}</span>
                  <span className="drill-title">{o.title}</span>
                  <span className={o.days > 7 ? 'drill-days flagged' : 'drill-days'}>{o.days}d</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ChartCard>
  );
}
