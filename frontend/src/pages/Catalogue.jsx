import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApp } from '../state/AppContext.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { genreTone, shortDate } from '../utils/display.js';

const blank = { title: '', author: '', genre: '', isbn: '', copies: 0, shelf: '' };

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'A title is required.';
  if (!values.author.trim()) errors.author = 'An author is required.';
  if (!values.genre.trim()) errors.genre = 'Add a genre.';
  if (!values.isbn.trim()) errors.isbn = 'Add an ISBN.';
  else if (!/^[0-9Xx\s-]{9,24}$/.test(values.isbn.trim())) errors.isbn = 'Use 9–24 digits, hyphens or X.';
  const copies = Number(values.copies);
  if (!Number.isInteger(copies) || copies < 0) errors.copies = 'Use a whole number of 0 or more.';
  return errors;
}

export default function Catalogue() {
  const { threshold, revision, refresh, notify } = useApp();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All genres');
  const [editor, setEditor] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.getBooks()
      .then((data) => live && setBooks(data))
      .catch((error) => live && notify(error.message, 'error'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [revision, notify]);

  const genres = ['All genres', ...Array.from(new Set(books.map((book) => book.genre))).sort()];
  const needle = search.trim().toLowerCase();
  const visible = books.filter((book) => {
    const matchesGenre = genre === 'All genres' || book.genre === genre;
    const matchesSearch = !needle ||
      [book.title, book.author, book.isbn, book.shelf].some((value) => String(value || '').toLowerCase().includes(needle));
    return matchesGenre && matchesSearch;
  });

  const closeEditor = () => { setEditor(null); setErrors({}); };

  const openCreate = () => setEditor({ id: null, values: { ...blank } });

  const openEdit = (book) => setEditor({
    id: book.id,
    values: {
      title: book.title, author: book.author, genre: book.genre,
      isbn: book.isbn, copies: book.copies, shelf: book.shelf || '',
    },
  });

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(editor.values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      ...editor.values,
      copies: Number(editor.values.copies),
      shelf: editor.values.shelf.trim() || null,
    };
    setSaving(true);
    try {
      if (editor.id) {
        await api.updateBook(editor.id, payload);
        notify('Title updated.');
      } else {
        await api.addBook(payload);
        notify('New title added to the catalogue.');
      }
      closeEditor();
      refresh();
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.removeBook(confirm.id);
      notify('Title removed from the catalogue.');
      setConfirm(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const setField = (key, value) => {
    setEditor((current) => ({ ...current, values: { ...current.values, [key]: value } }));
  };

  return (
    <div className="catalogue">
      <section className="toolbar">
        <div className="search-box">
          <Icon name="search" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, author, ISBN or shelf…"
            aria-label="Search catalogue"
          />
        </div>
        <select value={genre} onChange={(event) => setGenre(event.target.value)} aria-label="Filter by genre">
          {genres.map((option) => <option key={option}>{option}</option>)}
        </select>
        <button type="button" className="button button-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> Add title
        </button>
      </section>

      <section className="panel table-panel">
        <header className="panel-head">
          <div>
            <h3>Shelf catalogue</h3>
            <p>{visible.length} of {books.length} titles · below {threshold} copies needs restocking</p>
          </div>
        </header>

        {loading ? <p className="muted pad">Loading catalogue…</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th><th>Author</th><th>Genre</th><th>ISBN</th>
                  <th>Shelf</th><th>Copies</th><th>Updated</th><th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan="8" className="empty-cell">No titles match those filters.</td></tr>
                )}
                {visible.map((book) => (
                  <tr key={book.id} className={book.needsRestock ? 'row-warning' : ''}>
                    <td><strong>{book.title}</strong></td>
                    <td>{book.author}</td>
                    <td><span className={`genre-tag tone-${genreTone(book.genre)}`}>{book.genre}</span></td>
                    <td className="mono">{book.isbn}</td>
                    <td>{book.shelf || '—'}</td>
                    <td>
                      <StatusPill tone={book.needsRestock ? 'amber' : 'mint'}>{book.copies}</StatusPill>
                    </td>
                    <td>{shortDate(book.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-button" title="Edit title" onClick={() => openEdit(book)}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Adjust stock"
                          onClick={() => navigate(`/movements?book=${book.id}`)}
                        >
                          <Icon name="movement" size={16} />
                        </button>
                        <button type="button" className="icon-button danger" title="Remove title" onClick={() => setConfirm(book)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(editor)}
        title={editor?.id ? 'Edit title' : 'Add a new title'}
        subtitle="Fields marked in the catalogue are saved to the database."
        onClose={closeEditor}
        footer={
          <>
            <button type="button" className="button button-quiet" onClick={closeEditor}>Cancel</button>
            <button type="submit" form="catalogue-form" className="button button-primary" disabled={saving}>
              {saving ? 'Saving…' : editor?.id ? 'Save changes' : 'Add to shelf'}
            </button>
          </>
        }
      >
        {editor && (
          <form id="catalogue-form" className="form-grid" onSubmit={submit} noValidate>
            {errors.form && <p className="form-alert form-wide" role="alert">{errors.form}</p>}
            <Field label="Title" error={errors.title} wide>
              <input value={editor.values.title} onChange={(event) => setField('title', event.target.value)} />
            </Field>
            <Field label="Author" error={errors.author}>
              <input value={editor.values.author} onChange={(event) => setField('author', event.target.value)} />
            </Field>
            <Field label="Genre" error={errors.genre}>
              <input list="genre-options" value={editor.values.genre} onChange={(event) => setField('genre', event.target.value)} />
              <datalist id="genre-options">
                {genres.filter((item) => item !== 'All genres').map((item) => <option key={item} value={item} />)}
              </datalist>
            </Field>
            <Field label="ISBN" error={errors.isbn}>
              <input value={editor.values.isbn} onChange={(event) => setField('isbn', event.target.value)} placeholder="978…" />
            </Field>
            <Field label={editor.id ? 'Copies on hand' : 'Opening copies'} error={errors.copies}>
              <input type="number" min="0" step="1" value={editor.values.copies} onChange={(event) => setField('copies', event.target.value)} />
            </Field>
            <Field label="Shelf code" hint="Optional, e.g. T-14">
              <input value={editor.values.shelf} onChange={(event) => setField('shelf', event.target.value)} placeholder="T-14" />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        title="Remove this title?"
        compact
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="button button-quiet" onClick={() => setConfirm(null)}>Keep it</button>
            <button type="button" className="button button-danger" onClick={remove}>Remove title</button>
          </>
        }
      >
        <p><strong>{confirm?.title}</strong> and its movement history will be removed from the catalogue.</p>
      </Modal>
    </div>
  );
}
