import { useState } from 'react';
import OverviewView from './views/OverviewView.jsx';
import DetailView from './views/DetailView.jsx';

const TABS = [
  { id: 'overview', label: 'Tablero general' },
  { id: 'detail', label: 'Detalle por rango de fechas' },
];

export default function App() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Mesa de Ayuda · UTI PAE</h1>
          <p className="page-subtitle">Datos en vivo desde GLPI</p>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'overview' ? <OverviewView /> : <DetailView />}
    </div>
  );
}
