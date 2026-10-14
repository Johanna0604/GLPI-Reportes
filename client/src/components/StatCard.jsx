export default function StatCard({ label, value, tone = 'neutral', hint, children }) {
  return (
    <div className={`stat-card tile-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value tone-${tone}`}>{value}</div>
      {children}
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
