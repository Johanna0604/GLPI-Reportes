import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import DateRangeFilter from './components/DateRangeFilter.jsx';
import StatCard from './components/StatCard.jsx';
import StatusChart from './components/StatusChart.jsx';
import RankedBarChart from './components/RankedBarChart.jsx';
import SlaChart from './components/SlaChart.jsx';
import TrendChart from './components/TrendChart.jsx';

function useReport(fetcher, range) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher(range)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  return state;
}

export default function App() {
  const [range, setRange] = useState({ from: undefined, to: undefined });

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setRange({ from: d.toISOString().slice(0, 10), to: undefined });
  }, []);

  const summary = useReport(api.summary, range);
  const byStatus = useReport(api.byStatus, range);
  const byTechnician = useReport(api.byTechnician, range);
  const byCategory = useReport(api.byCategory, range);
  const sla = useReport(api.sla, range);
  const trends = useReport(api.trends, range);

  const s = summary.data;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reportes Mesa de Ayuda</h1>
          <p className="page-subtitle">UTI · PAE — datos en vivo desde GLPI</p>
        </div>
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
