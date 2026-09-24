import { useState } from 'react';

export default function ChartCard({ title, subtitle, loading, error, empty, columns, rows, children }) {
  const [showTable, setShowTable] = useState(false);
  const canShowTable = Boolean(columns && rows);

  return (
    <section className="chart-card">
      <header className="chart-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
        {canShowTable && !loading && !error && (
          <button type="button" className="table-toggle" onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </header>

      {loading && <div className="chart-state">Cargando…</div>}
      {!loading && error && <div className="chart-state chart-error">{error}</div>}
      {!loading && !error && empty && <div className="chart-state">Sin datos en el rango seleccionado.</div>}

      {!loading && !error && !empty && (showTable ? <DataTable columns={columns} rows={rows} /> : children)}
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>{row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
