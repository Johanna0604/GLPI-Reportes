import { useState } from 'react';

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return isoDate(d);
}

const PRESETS = [
  { key: '7d', label: 'Últimos 7 días', from: () => daysAgo(7) },
  { key: '30d', label: 'Últimos 30 días', from: () => daysAgo(30) },
  { key: '90d', label: 'Últimos 90 días', from: () => daysAgo(90) },
  { key: 'mtd', label: 'Mes en curso', from: () => monthStart() },
];

export default function DateRangeFilter({ range, onChange }) {
  const [activePreset, setActivePreset] = useState('30d');
  const [custom, setCustom] = useState(false);

  function applyPreset(preset) {
    setActivePreset(preset.key);
    setCustom(false);
    onChange({ from: preset.from(), to: undefined });
  }

  return (
    <div className="filter-row">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`filter-chip ${!custom && activePreset === p.key ? 'active' : ''}`}
          onClick={() => applyPreset(p)}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        className={`filter-chip ${custom ? 'active' : ''}`}
        onClick={() => setCustom(true)}
      >
        Rango personalizado
      </button>

      {custom && (
        <div className="filter-custom">
          <label>
            Desde
            <input
              type="date"
              value={range.from || ''}
              onChange={(e) => onChange({ ...range, from: e.target.value || undefined })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={range.to || ''}
              onChange={(e) => onChange({ ...range, to: e.target.value || undefined })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
