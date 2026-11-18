import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApp } from '../state/AppContext.jsx';
import StatTile from '../components/StatTile.jsx';
import StatusPill from '../components/StatusPill.jsx';
import Icon from '../components/Icon.jsx';
import { genreTone, shortDate, timeOfDay } from '../utils/display.js';

export default function Overview() {
  const { session, threshold, revision, notify } = useApp();
  const [books, setBooks] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([api.getBooks(), api.getMovements({ limit: 6 })])
      .then(([catalogue, ledger]) => {
        if (!live) return;
        setBooks(catalogue);
        setMovements(ledger);
      })
      .catch((error) => live && notify(error.message, 'error'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [revision, notify]);

  const totalCopies = books.reduce((sum, book) => sum + book.copies, 0);
  const watchlist = books.filter((book) => book.copies < threshold).sort((a, b) => a.copies - b.copies);
  const genres = new Set(books.map((book) => book.genre)).size;

  return (
    <div className="overview">
      <section className="greeting-card">
        <div>
          <p className="eyebrow">Good to see you</p>
          <h2>{session?.fullName}</h2>
          <p>Here is the state of the shelves right now.</p>
        </div>
        <div className="greeting-actions">
          <Link className="button button-light" to="/movements?intent=IN">
            <Icon name="plus" size={16} /> Receive stock
          </Link>
          <Link className="button button-ghost-light" to="/movements?intent=OUT">
            Record a loan <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>

      <section className="stat-grid">
        <StatTile label="Titles" value={books.length} note={`across ${genres} genres`} icon="books" tone="violet" />
        <StatTile label="Copies available" value={totalCopies} note="ready to be borrowed" icon="check" tone="mint" />
        <StatTile label="Need restocking" value={watchlist.length} note={`fewer than ${threshold} copies`} icon="alert" tone="amber" />
        <StatTile label="Ledger entries" value={movements.length} note="most recent activity" icon="movement" tone="blue" />
      </section>

      <section className="panel availability-panel">
        <header className="panel-head">
          <div>
            <h3>Current availability</h3>
            <p>Every title on the shelf and its live stock level.</p>
          </div>
          <Link className="text-link" to="/catalog">Manage catalogue <Icon name="arrow" size={14} /></Link>
        </header>

        {loading ? <p className="muted pad">Reading the shelves…</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Author</th><th>Genre</th><th>Copies</th><th>Status</th></tr>
              </thead>
              <tbody>
                {books.length === 0 && (
                  <tr><td colSpan="5" className="empty-cell">No titles are on the shelf yet.</td></tr>
                )}
                {books.map((book) => (
                  <tr key={book.id} className={book.copies < threshold ? 'row-warning' : ''}>
                    <td><strong>{book.title}</strong></td>
                    <td>{book.author}</td>
                    <td><span className={`genre-tag tone-${genreTone(book.genre)}`}>{book.genre}</span></td>
                    <td>{book.copies}</td>
                    <td>
                      <StatusPill tone={book.copies < threshold ? 'amber' : 'mint'}>
                        {book.copies < threshold ? 'Restock' : 'Available'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="overview-columns">
        <section className="panel">
          <header className="panel-head">
            <div>
              <h3>Restock watchlist</h3>
              <p>Titles sitting below the safe level of {threshold} copies.</p>
            </div>
            <Link className="text-link" to="/catalog">View catalogue <Icon name="arrow" size={14} /></Link>
          </header>

          {loading ? <p className="muted pad">Reading the shelves…</p> : watchlist.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark"><Icon name="check" size={22} /></span>
              <strong>All shelves look healthy</strong>
              <p>No title is below the restock level.</p>
            </div>
          ) : (
            <ul className="watch-list">
              {watchlist.map((book) => {
                const percent = Math.min(100, Math.round((book.copies / threshold) * 100));
                return (
                  <li key={book.id} className="watch-item">
                    <div className="watch-top">
                      <div>
                        <span className={`genre-tag tone-${genreTone(book.genre)}`}>{book.genre}</span>
                        <strong>{book.title}</strong>
                        <small>{book.author}</small>
                      </div>
                      <StatusPill tone="amber">{book.copies} left</StatusPill>
                    </div>
                    <div className="stock-track" aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                    <Link className="text-link" to={`/movements?book=${book.id}&intent=IN`}>
                      Receive copies <Icon name="arrow" size={13} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <header className="panel-head">
            <div>
              <h3>Recent activity</h3>
              <p>The last entries in the movement ledger.</p>
            </div>
            <Link className="text-link" to="/movements">Open ledger <Icon name="arrow" size={14} /></Link>
          </header>

          {loading ? <p className="muted pad">Reading the ledger…</p> : movements.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark"><Icon name="movement" size={22} /></span>
              <strong>No movement recorded yet</strong>
              <p>Stock changes will appear here.</p>
            </div>
          ) : (
            <ol className="timeline">
              {movements.map((entry) => (
                <li key={entry.id}>
                  <span className={`timeline-dot ${entry.direction === 'IN' ? 'in' : 'out'}`}>
                    {entry.direction === 'IN' ? '+' : '−'}
                  </span>
                  <div className="timeline-body">
                    <div className="timeline-line">
                      <strong>{entry.bookTitle}</strong>
                      <StatusPill tone={entry.direction === 'IN' ? 'mint' : 'violet'}>
                        {entry.direction === 'IN' ? 'Received' : 'Loaned'} {entry.copies}
                      </StatusPill>
                    </div>
                    <small>
                      {entry.memberName ? `${entry.memberName} · ` : ''}
                      {shortDate(entry.recordedAt)} at {timeOfDay(entry.recordedAt)}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
