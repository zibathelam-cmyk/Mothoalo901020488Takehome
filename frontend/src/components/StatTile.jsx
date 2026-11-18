import Icon from './Icon.jsx';

export default function StatTile({ label, value, note, tone = 'brand', icon = 'books' }) {
  return (
    <article className={`stat-tile stat-${tone}`}>
      <span className="stat-icon"><Icon name={icon} size={19} /></span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-note">{note}</p>
      </div>
    </article>
  );
}
