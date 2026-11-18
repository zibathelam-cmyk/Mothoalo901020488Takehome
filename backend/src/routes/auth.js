import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute, HttpError } from '../errors.js';
import { text } from '../validation.js';
import { verifySecret } from '../security.js';

const router = Router();

const publicMember = (row) => ({
  id: Number(row.member_id),
  fullName: row.full_name,
  membershipNo: row.membership_no,
  role: row.role,
  joinedOn: row.joined_on,
});

router.post(
  '/signin',
  asyncRoute(async (req, res) => {
    const membershipNo = text(req.body?.membershipNo, 'Membership number');
    const password = text(req.body?.password, 'Password', { max: 200 });

    const { rows } = await query('SELECT * FROM library_members WHERE membership_no = $1', [
      membershipNo.toUpperCase(),
    ]);

    const valid = rows.length > 0 && (await verifySecret(password, rows[0].password_hash));
    if (!valid) {
      throw new HttpError(401, 'Membership number or passphrase is not recognised.', 'INVALID_CREDENTIALS');
    }

    res.json({ data: publicMember(rows[0]) });
  })
);

export default router;
