import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApp } from '../state/AppContext.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { shortDate, timeOfDay } from '../utils/display.js';

export default function Movements() {
  const { revision, refresh, notify, threshold } = useApp();
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({
    bookId: '', direction: 'OUT', copies: 1, memberId: '', note: '',
  });

  useEffect(() => {
    const book = searchParams.get('book');
    const intent = searchParams.get('intent');
    setForm((current) => ({
      ...current,
      bookId: book || current.bookId,
      direction: intent === 'IN' || intent === 'OUT' ? intent : current.direction,
    }));
  }, [searchParams]);

  useEffect(() => {
    let live = true;
    Promise.all([
      api.getBooks(),
      api.getMembers().catch(() => []),
      api.getMovements({ limit: 80 }),
    ])
      .then(([catalogue, people, history]) => {
        if (!live) return;
        setBooks(catalogue);
        setMembers(people);
        setLedger(history);
      })
      .catch((error) => live && notify(error.message, 'error'));
    return () => { live = false; };
  }, [revision, notify]);

  const selected = books.find((book) => String(book.id) === String(form.bookId));

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    const copies = Number(form.copies);

    if (!selected) found.bookId = 'Choose a book.';
    if (!Number.isInteger(copies) || copies < 1) found.copies = 'Use a whole number of 1 or more.';
    if (form.direction === 'OUT' && !form.memberId) found.memberId = 'Select the member borrowing the book.';
    if (form.direction === 'OUT' && selected && copies > selected.copies) {
      found.copies = `Only ${selected.copies} copy/copies available.`;
    }

    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api.recordMovement({
        bookId: Number(form.bookId),
        direction: form.direction,
        copies,
        memberId: form.memberId ? Number(form.memberId) : null,
        note: form.note.trim() || null,
      });
      notify(form.direction === 'IN' ? 'Arrival recorded on the ledger.' : 'Loan recorded on the ledger.');
      setForm((current) => ({ ...current, copies: 1, note: '' }));
      setErrors({});
      refresh();
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setBusy(false);
    }
  };

  const openNoteEditor = (entry) => {
    setEditing(entry);
    setNoteDraft(entry.note || '');
  };

  const saveNote = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateMovement(editing.id, { note: noteDraft.trim() || null });
      notify('Movement note updated.');
      setEditing(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeMovement = async () => {
    setBusy(true);
    try {
      await api.removeMovement(confirm.id);
      notify('Movement removed and stock adjusted.');
      setConfirm(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const visibleLedger = filter === 'ALL' ? ledger : ledger.filter((entry) => entry.direction === filter);

  return (
    <div className="movements-layout">
      <section className="panel stock-desk">
        <header className="panel-head">
          <div>
            <h3>Stock desk</h3>
            <p>Record arrivals and loans in one place.</p>
          </div>
          <span className="desk-icon"><Icon name="movement" size={20} /></span>
        </header>

        <form onSubmit={submit} noValidate>
          {errors.form && <p className="form-alert" role="alert">{errors.form}</p>}

          <div className="direction-switch" role="group" aria-label="Movement direction">
            <button
              type="button"
              className={form.direction === 'OUT' ? 'selected out' : ''}
              onClick={() => setField('direction', 'OUT')}
            >
              Loan out
            </button>
            <button
              type="button"
              className={form.direction === 'IN' ? 'selected in' : ''}
              onClick={() => setField('direction', 'IN')}
            >
              Receive in
            </button>
          </div>

          <Field label="Book" error={errors.bookId}>
            <select value={form.bookId} onChange={(event) => setField('bookId', event.target.value)}>
              <option value="">Choose a title…</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} · {book.copies} available
                </option>
              ))}
            </select>
          </Field>

          {selected && (
            <div className="availability-strip">
              <span>Available now</span>
              <StatusPill tone={selected.copies < threshold ? 'amber' : 'mint'}>{selected.copies} copies</StatusPill>
              <span className="shelf-hint">Shelf {selected.shelf || '—'}</span>
            </div>
          )}

          <div className="form-pair">
            <Field label="Copies" error={errors.copies}>
              <input type="number" min="1" step="1" value={form.copies} onChange={(event) => setField('copies', event.target.value)} />
            </Field>
            <Field
              label={form.direction === 'OUT' ? 'Borrower' : 'Member (optional)'}
              error={errors.memberId}
            >
              <select value={form.memberId} onChange={(event) => setField('memberId', event.target.value)}>
                <option value="">{form.direction === 'OUT' ? 'Select a member…' : 'No member'}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.fullName} · {member.membershipNo}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Note" hint="Optional reason, e.g. 'new delivery' or 'damaged copy'">
            <input value={form.note} onChange={(event) => setField('note', event.target.value)} placeholder="Add a short note…" />
          </Field>

          <button className="button button-primary button-block" type="submit" disabled={busy}>
            {busy ? 'Recording…' : form.direction === 'IN' ? 'Record arrival' : 'Record loan'}
          </button>
        </form>
      </section>

      <section className="panel ledger-panel">
        <header className="panel-head">
          <div>
            <h3>Movement ledger</h3>
            <p>Every stock change, newest first.</p>
          </div>
          <div className="filter-switch">
            {['ALL', 'IN', 'OUT'].map((option) => (
              <button
                key={option}
                type="button"
                className={filter === option ? 'active' : ''}
                onClick={() => setFilter(option)}
              >
                {option === 'ALL' ? 'All' : option === 'IN' ? 'Arrivals' : 'Loans'}
              </button>
            ))}
          </div>
        </header>

        <div className="table-scroll">
          <table className="data-table ledger-table">
            <thead>
              <tr>
                <th>When</th><th>Book</th><th>Type</th><th>Copies</th>
                <th>Member</th><th>Note</th><th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLedger.length === 0 && <tr><td colSpan="7" className="empty-cell">No movements in this view yet.</td></tr>}
              {visibleLedger.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{shortDate(entry.recordedAt)}</strong>
                    <small className="cell-sub">{timeOfDay(entry.recordedAt)}</small>
                  </td>
                  <td>{entry.bookTitle}</td>
                  <td>
                    <StatusPill tone={entry.direction === 'IN' ? 'mint' : 'violet'}>
                      {entry.direction === 'IN' ? 'Arrival' : 'Loan'}
                    </StatusPill>
                  </td>
                  <td className="strong">{entry.copies}</td>
                  <td>{entry.memberName || '—'}</td>
                  <td className="muted">{entry.note || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit note"
                        onClick={() => openNoteEditor(entry)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger"
                        title="Remove movement"
                        onClick={() => setConfirm(entry)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(editing)}
        title="Edit movement note"
        subtitle={editing ? `${editing.direction === 'IN' ? 'Arrival' : 'Loan'} · ${editing.bookTitle}` : ''}
        compact
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="button button-quiet" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" form="movement-note-form" className="button button-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save note'}
            </button>
          </>
        }
      >
        {editing && (
          <form id="movement-note-form" onSubmit={saveNote}>
            <Field label="Note" hint="Optional reason for this movement.">
              <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={240} />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        title="Remove this movement?"
        compact
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="button button-quiet" onClick={() => setConfirm(null)}>Keep it</button>
            <button type="button" className="button button-danger" onClick={removeMovement} disabled={busy}>
              {busy ? 'Removing…' : 'Remove movement'}
            </button>
          </>
        }
      >
        <p>
          <strong>{confirm?.bookTitle}</strong> · {confirm?.direction === 'IN' ? 'arrival' : 'loan'} of {confirm?.copies} copies.
          The stock level will be adjusted back automatically.
        </p>
      </Modal>
    </div>
  );
}
