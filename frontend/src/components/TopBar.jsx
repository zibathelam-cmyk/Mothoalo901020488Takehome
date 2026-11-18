import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { initials, longDate } from '../utils/display.js';
import Icon from './Icon.jsx';

const headings = {
  '/': ['Overview', 'What is happening at the desk today'],
  '/catalog': ['Catalogue', 'Manage every title on the shelf'],
  '/movements': ['Stock movements', 'Receive new copies and record loans'],
  '/members': ['Members', 'Who may borrow from the library'],
};

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, signOut, refresh } = useApp();
  const [title, subtitle] = headings[pathname] || ['BukaHub', 'Library circulation desk'];

  return (
    <header className="top-bar">
      <div className="top-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="top-actions">
        <span className="today-label">{longDate(new Date())}</span>
        <button type="button" className="icon-button" onClick={refresh} title="Reload data" aria-label="Reload data">
          <Icon name="refresh" />
        </button>
        <div className="user-chip" title={session?.fullName}>
          <span className="avatar">{initials(session?.fullName)}</span>
          <span className="user-text">
            <strong>{session?.fullName}</strong>
            <small>{session?.membershipNo}</small>
          </span>
        </div>
        <button
          type="button"
          className="sign-out"
          onClick={() => { signOut(); navigate('/signin', { replace: true }); }}
        >
          <Icon name="signout" size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
