import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

const links = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/catalog', label: 'Catalogue', icon: 'books' },
  { to: '/movements', label: 'Stock movements', icon: 'movement' },
  { to: '/members', label: 'Members', icon: 'members' },
];

export default function SideNav() {
  return (
    <aside className="side-nav">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <div>
          <strong>BukaHub</strong>
          <small>library desk</small>
        </div>
      </div>

      <nav className="side-links" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
          >
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-foot">
        <span className="side-foot-line" />
        <p>Every book has a home.<br />Every loan has a record.</p>
        <small>BukaHub · v1.0</small>
      </div>
    </aside>
  );
}
