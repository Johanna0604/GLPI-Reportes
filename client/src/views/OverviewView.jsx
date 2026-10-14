import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';
import AgeBucketsChart from '../components/AgeBucketsChart.jsx';
import TechnicianRanking from '../components/TechnicianRanking.jsx';
import FlowChart from '../components/FlowChart.jsx';
import RankedBarChart from '../components/RankedBarChart.jsx';

const REFRESH_MS = 60_000;

const fmtHours = (h) => (h == null ? 'N/D' : h >= 48 ? `${(h / 24).toFixed(1)} d` : `${h} h`);

function ago(ts, now) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `hace ${s} s`;
  return `hace ${Math.round(s / 60)} min`;
}

export default function OverviewView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [tick, setTick] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      setData(await api.overview());
      setLoadedAt(Date.now());
      setError(null);
    } catch (err) {
      // Se conserva el último dato bueno y se avisa que está desactualizado.
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    const clock = setInterval(() => setTick(Date.now()), 5_000);
    const onVisible = () => !document.hidden && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(refresh);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  if (!data) {
    return <div className="chart-state">{error ? <span className="chart-error">{error}</span> : 'Cargando tablero…'}</div>;
  }

  const k = data.kpis;
  const entities = { total: data.ticketsInWindow, data: data.entities };
  const res = k.resolution;

  return (
    <div>
      <div className="live-bar">
        <span className={`live-dot ${error ? 'stale' : ''}`} aria-hidden="true" />
        <span>
          Corte GLPI: <b>{data.asOf}</b> · actualizado {ago(loadedAt, tick)} · se refresca cada {REFRESH_MS / 1000} s
        </span>
        {error && <span className="live-error">Sin conexión con el servidor — mostrando el último dato ({error})</span>}
      </div>

      {data.unknownTechnicians.length > 0 && (
        <div className="notice">
          Técnicos sin equipo asignado (se muestran como Soporte Técnico): {data.unknownTechnicians.join(', ')}. Confirma su equipo para agregarlos a la tabla de equipos.
        </div>
      )}

      <div className="kpi-row">
        <StatCard label="Tickets pendientes" value={k.pendientes.value} tone={k.pendientes.tone} hint="Meta ≤ 60" />
        <StatCard label="Sin técnico asignado" value={k.sinAsignar.value} tone={k.sinAsignar.tone} hint="Debe ser 0" />
        <StatCard label="Casos con más de 7 días" value={k.over7.value} tone={k.over7.tone} hint="Meta 0" />
        <StatCard label="Antigüedad máxima" value={`${k.maxAge.value} d`} tone={k.maxAge.tone} hint="Escalar si > 30 d" />
        <StatCard label="Sin actualizar > 7 días" value={k.stale.value} tone={k.stale.tone} hint="Pedir avance al técnico" />
        <StatCard
          label="Hoy: ingresados / cerrados"
          value={`${k.today.opened} / ${k.today.closed}`}
          tone={k.today.tone}
          hint={data.flowTotals.growingStreak >= 3 ? `Backlog creciendo ${data.flowTotals.growingStreak} días seguidos` : 'Backlog estable o bajando'}
        />
      </div>

      <div className="chart-grid">
        <AgeBucketsChart buckets={data.buckets} />
        <TechnicianRanking technicians={data.technicians} />
        <div className="chart-grid-full">
          <FlowChart flow={data.flow} totals={data.flowTotals} windowDays={data.windowDays} />
        </div>
      </div>

      <h2 className="section-title">Contexto · últimos {data.windowDays} días</h2>
      <div className="context-grid">
        <StatCard
          label="Tiempo de resolución (mediana)"
          value={fmtHours(res.medianHours)}
          tone={res.tone}
          hint={
            res.changePct == null
              ? `P90 ${fmtHours(res.p90Hours)}`
              : `P90 ${fmtHours(res.p90Hours)} · ${res.changePct > 0 ? '▲' : '▼'} ${Math.abs(res.changePct)}% vs. 30 d previos`
          }
        />
        <StatCard
          label="Tickets sin categoría"
          value={`${k.noCategory.value}%`}
          tone={k.noCategory.tone}
          hint={`${k.noCategory.count} de ${data.ticketsInWindow} · meta < 5%`}
        />
        <RankedBarChart
          title="Top 5 entidades con más tickets"
          nameKey="entity"
          columnLabel="Entidad"
          data={entities}
          loading={false}
          error={null}
        />
      </div>
    </div>
  );
}
