import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute, HttpError } from '../errors.js';
import { badRequest, choice, identifier, text } from '../validation.js';
import { hashSecret } from '../security.js';

const router = Router();

const presentMember = (row) => ({
  id: Number(row.member_id),
  fullName: row.full_name,
  membershipNo: row.membership_no,
  role: row.role,
  joinedOn: row.joined_on,
});

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    const { rows } = await query(
      'SELECT * FROM library_members ORDER BY role DESC, full_name ASC'
    );
    res.json({ data: rows.map(presentMember) });
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const fullName = text(req.body?.fullName, 'Full name', { max: 140 });
    const membershipNo = text(req.body?.membershipNo, 'Membership number', { max: 32 }).toUpperCase();
    const role = choice(req.body?.role || 'member', ['MEMBER', 'ADMIN'], 'Role').toLowerCase();
    const password = text(req.body?.password, 'Passphrase', { max: 200 });
    if (password.length < 6) throw badRequest('Passphrase must be at least 6 characters.');

    const { rows } = await query(
      `INSERT INTO library_members (full_name, membership_no, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [fullName, membershipNo, role, await hashSecret(password)]
    );
    res.status(201).json({ data: presentMember(rows[0]) });
  })
);

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = identifier(req.params.id, 'Member');
    const assignments = [];
    const params = [];

    const push = (column, value) => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (req.body?.fullName !== undefined) {
      push('full_name', text(req.body.fullName, 'Full name', { max: 140 }));
    }
    if (req.body?.membershipNo !== undefined) {
      push('membership_no', text(req.body.membershipNo, 'Membership number', { max: 32 }).toUpperCase());
    }
    if (req.body?.role !== undefined) {
      push('role', choice(req.body.role, ['MEMBER', 'ADMIN'], 'Role').toLowerCase());
    }
    if (req.body?.password !== undefined && req.body.password !== '') {
      const password = text(req.body.password, 'Passphrase', { max: 200 });
      if (password.length < 6) throw badRequest('Passphrase must be at least 6 characters.');
      push('password_hash', await hashSecret(password));
    }
    if (!assignments.length) throw badRequest('No changes were supplied.');

    params.push(id);
    const { rows } = await query(
      `UPDATE library_members SET ${assignments.join(', ')} WHERE member_id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) throw new HttpError(404, 'That member was not found.', 'NOT_FOUND');
    res.json({ data: presentMember(rows[0]) });
  })
);

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const id = identifier(req.params.id, 'Member');
    const target = await query('SELECT role FROM library_members WHERE member_id = $1', [id]);
    if (!target.rows.length) throw new HttpError(404, 'That member was not found.', 'NOT_FOUND');

    if (target.rows[0].role === 'admin') {
      const { rows } = await query("SELECT count(*)::int AS total FROM library_members WHERE role = 'admin'");
      if (rows[0].total <= 1) {
        throw new HttpError(409, 'At least one administrator must remain.', 'LAST_ADMIN');
      }
    }

    await query('DELETE FROM library_members WHERE member_id = $1', [id]);
    res.json({ data: { removed: true } });
  })
);

export default router;
