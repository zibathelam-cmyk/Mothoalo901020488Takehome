import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncRoute, HttpError } from '../errors.js';
import { badRequest, choice, identifier, text, whole } from '../validation.js';

const router = Router();

const presentMovement = (row, extras = {}) => ({
  id: Number(row.movement_id),
  bookId: Number(row.book_id),
  bookTitle: extras.bookTitle || row.book_title || 'Unknown title',
  direction: row.direction,
  copies: row.copies,
  memberId: row.member_id === null || row.member_id === undefined ? null : Number(row.member_id),
  memberName: extras.memberName || row.member_name || null,
  membershipNo: row.membership_no || null,
  note: row.note,
  recordedAt: row.recorded_at,
});

const readMovement = async (id) => {
  const { rows } = await query(
    `SELECT m.*, b.title AS book_title, mem.full_name AS member_name, mem.membership_no
       FROM stock_movements m
       JOIN library_books b ON b.book_id = m.book_id
       LEFT JOIN library_members mem ON mem.member_id = m.member_id
      WHERE m.movement_id = $1`,
    [id]
  );
  return rows[0];
};

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const filters = [];
    const params = [];

    if (req.query.bookId) {
      params.push(identifier(req.query.bookId, 'Book'));
      filters.push(`m.book_id = $${params.length}`);
    }
    if (req.query.direction) {
      params.push(choice(req.query.direction, ['IN', 'OUT'], 'Direction'));
      filters.push(`m.direction = $${params.length}`);
    }

    const requestedLimit = Number(req.query.limit) || 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 200);
    params.push(limit);

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT m.*, b.title AS book_title, mem.full_name AS member_name, mem.membership_no
         FROM stock_movements m
         JOIN library_books b ON b.book_id = m.book_id
         LEFT JOIN library_members mem ON mem.member_id = m.member_id
         ${where}
        ORDER BY m.recorded_at DESC, m.movement_id DESC
        LIMIT $${params.length}`,
      params
    );

    res.json({ data: rows.map((row) => presentMovement(row)) });
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const bookId = identifier(req.body?.bookId, 'Book');
    const direction = choice(req.body?.direction, ['IN', 'OUT'], 'Direction');
    const copies = whole(req.body?.copies, 'Copies', { min: 1 });
    const note = text(req.body?.note, 'Note', { max: 240, required: false });

    let memberId = null;
    if (direction === 'OUT' || req.body?.memberId) {
      memberId = identifier(req.body?.memberId, 'Member');
    }

    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        'SELECT book_id, title, copies_on_hand FROM library_books WHERE book_id = $1 FOR UPDATE',
        [bookId]
      );
      if (!locked.rows.length) throw new HttpError(404, 'That title is not on the shelf.', 'NOT_FOUND');

      const book = locked.rows[0];
      if (direction === 'OUT' && book.copies_on_hand < copies) {
        throw new HttpError(
          409,
          `Only ${book.copies_on_hand} copy/copies of "${book.title}" are available.`,
          'INSUFFICIENT_STOCK'
        );
      }

      if (memberId) {
        const member = await client.query('SELECT member_id FROM library_members WHERE member_id = $1', [memberId]);
        if (!member.rows.length) throw new HttpError(400, 'That member was not found.', 'BAD_REFERENCE');
      }

      const nextCopies = direction === 'IN'
        ? book.copies_on_hand + copies
        : book.copies_on_hand - copies;

      await client.query(
        'UPDATE library_books SET copies_on_hand = $1, updated_at = now() WHERE book_id = $2',
        [nextCopies, bookId]
      );

      const inserted = await client.query(
        `INSERT INTO stock_movements (book_id, member_id, direction, copies, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [bookId, memberId, direction, copies, note]
      );

      return { book, movement: inserted.rows[0], nextCopies };
    });

    let memberName = null;
    if (memberId) {
      const found = await query('SELECT full_name FROM library_members WHERE member_id = $1', [memberId]);
      memberName = found.rows[0]?.full_name || null;
    }

    res.status(201).json({
      data: {
        movement: presentMovement(result.movement, {
          bookTitle: result.book.title,
          memberName,
        }),
        availableCopies: result.nextCopies,
      },
    });
  })
);

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = identifier(req.params.id, 'Movement');
    if (req.body?.note === undefined) throw badRequest('No changes were supplied.');

    const note = text(req.body.note, 'Note', { max: 240, required: false });
    const { rowCount } = await query('UPDATE stock_movements SET note = $1 WHERE movement_id = $2', [note, id]);
    if (!rowCount) throw new HttpError(404, 'That movement was not found.', 'NOT_FOUND');

    res.json({ data: presentMovement(await readMovement(id)) });
  })
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = identifier(req.params.id, 'Movement');

    await withTransaction(async (client) => {
      const found = await client.query('SELECT * FROM stock_movements WHERE movement_id = $1 FOR UPDATE', [id]);
      if (!found.rows.length) throw new HttpError(404, 'That movement was not found.', 'NOT_FOUND');
      const movement = found.rows[0];

      const locked = await client.query(
        'SELECT book_id, copies_on_hand FROM library_books WHERE book_id = $1 FOR UPDATE',
        [movement.book_id]
      );
      if (!locked.rows.length) throw new HttpError(404, 'That title is not on the shelf.', 'NOT_FOUND');

      const current = locked.rows[0].copies_on_hand;
      const nextCopies = movement.direction === 'IN'
        ? current - movement.copies
        : current + movement.copies;

      if (nextCopies < 0) {
        throw new HttpError(
          409,
          `Only ${current} copies remain; that arrival cannot be removed.`,
          'INSUFFICIENT_STOCK'
        );
      }

      await client.query(
        'UPDATE library_books SET copies_on_hand = $1, updated_at = now() WHERE book_id = $2',
        [nextCopies, movement.book_id]
      );
      await client.query('DELETE FROM stock_movements WHERE movement_id = $1', [id]);
    });

    res.json({ data: { removed: true } });
  })
);

export default router;
