import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import DateRangeFilter from './components/DateRangeFilter.jsx';
import StatCard from './components/StatCard.jsx';
import StatusChart from './components/StatusChart.jsx';
import RankedBarChart from './components/RankedBarChart.jsx';
import SlaChart from './components/SlaChart.jsx';
import TrendChart from './components/TrendChart.jsx';

// Intervalo de auto-refresco en segundos (VITE_REFRESH_SECONDS al construir);
// 0 lo desactiva. Debe ser >= al TTL de la caché del backend para ser útil.
const REFRESH_SECONDS = Number(import.meta.env.VITE_REFRESH_SECONDS ?? 120);

function useReport(fetcher, range, tick) {
  const [state, setState] = useState({ data: null, loading: true, error: null, updatedAt: null });

  useEffect(() => {
    let cancelled = false;
    // En un refresco automático se conservan los datos visibles (sin parpadeo
    // de "cargando"); solo la primera carga o un cambio de rango limpian.
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    fetcher(range)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null, updatedAt: new Date() });
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, tick]);

  return state;
}

export default function App() {
  const [range, setRange] = useState({ from: undefined, to: undefined });

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setRange({ from: d.toISOString().slice(0, 10), to: undefined });
  }, []);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!REFRESH_SECONDS) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, REFRESH_SECONDS * 1000);
    const onVisible = () => !document.hidden && setTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const summary = useReport(api.summary, range, tick);
  const byStatus = useReport(api.byStatus, range, tick);
  const byTechnician = useReport(api.byTechnician, range, tick);
  const byCategory = useReport(api.byCategory, range, tick);
  const sla = useReport(api.sla, range, tick);
  const trends = useReport(api.trends, range, tick);

  const s = summary.data;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reportes Mesa de Ayuda</h1>
          <p className="page-subtitle">
            UTI · PAE — datos desde GLPI
            {summary.updatedAt &&
              ` · actualizado ${summary.updatedAt.toLocaleTimeString('es-PE')}`}
            {REFRESH_SECONDS > 0 && ` · se refresca cada ${Math.round(REFRESH_SECONDS / 60 * 10) / 10} min`}
          </p>
        </div>
        <button className="refresh-btn" onClick={() => setTick((t) => t + 1)}>
          Actualizar ahora
        </button>
      </header>

      <DateRangeFilter range={range} onChange={setRange} />

      <div className="stat-row">
        <StatCard label="Total de tickets" value={summary.loading ? '—' : s?.totalTickets ?? '—'} />
        <StatCard label="Tickets abiertos" value={summary.loading ? '—' : s?.open ?? '—'} tone="warning" />
        <StatCard label="Tickets cerrados" value={summary.loading ? '—' : s?.closed ?? '—'} tone="good" />
        <StatCard
          label="Cumplimiento SLA"
          value={summary.loading ? '—' : s?.slaComplianceRate != null ? `${s.slaComplianceRate}%` : 'N/D'}
          tone={s?.slaComplianceRate != null && s.slaComplianceRate < 80 ? 'critical' : 'good'}
        />
      </div>

      <div className="chart-grid">
        <StatusChart data={byStatus.data} loading={byStatus.loading} error={byStatus.error} />
        <SlaChart data={sla.data} loading={sla.loading} error={sla.error} />
        <RankedBarChart
          title="Tickets por técnico"
          nameKey="technician"
          columnLabel="Técnico"
          data={byTechnician.data}
          loading={byTechnician.loading}
          error={byTechnician.error}
        />
        <RankedBarChart
          title="Tickets por categoría"
          nameKey="category"
          columnLabel="Categoría"
          data={byCategory.data}
          loading={byCategory.loading}
          error={byCategory.error}
        />
        <div className="chart-grid-full">
          <TrendChart data={trends.data} loading={trends.loading} error={trends.error} />
        </div>
      </div>
    </div>
  );
}
