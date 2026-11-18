import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from './config.js';
import { hashSecret } from './security.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const starterBooks = [
  ['Motseng oa Lithaba', 'Mathias Mokoena', 'Cultural Studies', '9789991234567', 1, 'L-02'],
  ['Database Design in Practice', 'Naledi Pheko', 'Technology', '9781984822178', 5, 'T-14'],
  ['The Mountain Kingdom', 'Sarah Mokhosi', 'History', '9780620705812', 3, 'H-08'],
  ['Financial Accounting Basics', 'Palesa Ntsekhe', 'Business', '9780702174563', 0, 'B-11'],
  ['Poems from the Maluti', 'Thabo Letsie', 'Poetry', '9780639001234', 2, 'P-05'],
  ['Web Applications with React', 'Irene Kgosana', 'Technology', '9781838648818', 6, 'T-02'],
];

export async function initializeDatabase() {
  const schema = await readFile(new URL('./init.sql', import.meta.url), 'utf8');
  await pool.query(schema);

  const circulatorHash = await hashSecret(process.env.CIRCULATOR_PASSWORD || 'deskPass!26');
  await pool.query(
    `INSERT INTO library_members (full_name, membership_no, role, password_hash)
     VALUES ('Circulation Desk', 'CIRC-7420', 'admin', $1)
     ON CONFLICT (membership_no) DO NOTHING`,
    [circulatorHash]
  );

  const memberHash = await hashSecret('reader321');
  await pool.query(
    `INSERT INTO library_members (full_name, membership_no, role, password_hash)
     VALUES ('Lerato Mokoena', 'MEM-1042', 'member', $1)
     ON CONFLICT (membership_no) DO NOTHING`,
    [memberHash]
  );

  for (const [title, author, genre, isbn, copies, shelf] of starterBooks) {
    await pool.query(
      `INSERT INTO library_books
        (title, author, genre, isbn, copies_on_hand, shelf_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (isbn) DO NOTHING`,
      [title, author, genre, isbn, copies, shelf]
    );
  }
}
