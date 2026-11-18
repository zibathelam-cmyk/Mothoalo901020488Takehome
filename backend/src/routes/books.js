import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db.js';
import { asyncRoute, HttpError } from '../errors.js';
import { badRequest, identifier, text, whole } from '../validation.js';

const router = Router();

const presentBook = (row) => ({
  id: Number(row.book_id),
  title: row.title,
  author: row.author,
  genre: row.genre,
  isbn: row.isbn,
  copies: row.copies_on_hand,
  shelf: row.shelf_code,
  needsRestock: row.copies_on_hand < config.lowStockThreshold,
  updatedAt: row.updated_at,
});

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const clauses = [];
    const params = [];

    const search = String(req.query.search || '').trim();
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(b.title ILIKE $${params.length} OR b.author ILIKE $${params.length} OR b.isbn ILIKE $${params.length})`);
    }

    const genre = String(req.query.genre || '').trim();
    if (genre) {
      params.push(genre);
      clauses.push(`b.genre = $${params.length}`);
    }

    if (String(req.query.restock || '') === 'true') {
      params.push(config.lowStockThreshold);
      clauses.push(`b.copies_on_hand < $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT b.* FROM library_books b ${where} ORDER BY b.title ASC`,
      params
    );

    res.json({ data: rows.map(presentBook) });
  })
);

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM library_books WHERE book_id = $1', [
      identifier(req.params.id, 'Book'),
    ]);
    if (!rows.length) throw new HttpError(404, 'That title is not on the shelf.', 'NOT_FOUND');
    res.json({ data: presentBook(rows[0]) });
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const values = [
      text(req.body?.title, 'Title', { max: 180 }),
      text(req.body?.author, 'Author', { max: 140 }),
      text(req.body?.genre, 'Genre', { max: 60 }),
      text(req.body?.isbn, 'ISBN', { max: 24 }).replace(/[\s-]/g, ''),
      whole(req.body?.copies, 'Opening copies', { min: 0 }),
      text(req.body?.shelf, 'Shelf code', { max: 16, required: false }),
    ];

    const { rows } = await query(
      `INSERT INTO library_books
        (title, author, genre, isbn, copies_on_hand, shelf_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      values
    );

    res.status(201).json({ data: presentBook(rows[0]) });
  })
);

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = identifier(req.params.id, 'Book');
    const rules = [
      ['title', 'title', (v) => text(v, 'Title', { max: 180 })],
      ['author', 'author', (v) => text(v, 'Author', { max: 140 })],
      ['genre', 'genre', (v) => text(v, 'Genre', { max: 60 })],
      ['isbn', 'isbn', (v) => text(v, 'ISBN', { max: 24 }).replace(/[\s-]/g, '')],
      ['copies', 'copies_on_hand', (v) => whole(v, 'Copies', { min: 0 })],
      ['shelf', 'shelf_code', (v) => text(v, 'Shelf code', { max: 16, required: false })],
    ];

    const assignments = [];
    const params = [];
    for (const [key, column, parse] of rules) {
      if (req.body?.[key] === undefined) continue;
      params.push(parse(req.body[key]));
      assignments.push(`${column} = $${params.length}`);
    }
    if (!assignments.length) throw badRequest('No changes were supplied.');

    params.push(id);
    const { rows } = await query(
      `UPDATE library_books
          SET ${assignments.join(', ')}, updated_at = now()
        WHERE book_id = $${params.length}
        RETURNING *`,
      params
    );
    if (!rows.length) throw new HttpError(404, 'That title is not on the shelf.', 'NOT_FOUND');

    res.json({ data: presentBook(rows[0]) });
  })
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { rowCount } = await query('DELETE FROM library_books WHERE book_id = $1', [
      identifier(req.params.id, 'Book'),
    ]);
    if (!rowCount) throw new HttpError(404, 'That title is not on the shelf.', 'NOT_FOUND');
    res.json({ data: { removed: true } });
  })
);

export default router;
