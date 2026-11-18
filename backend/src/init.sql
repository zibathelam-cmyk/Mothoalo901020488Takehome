-- BukaHub library desk schema
CREATE TABLE IF NOT EXISTS library_books (
  book_id         BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  author          TEXT NOT NULL CHECK (length(btrim(author)) > 0),
  genre           TEXT NOT NULL CHECK (length(btrim(genre)) > 0),
  isbn            VARCHAR(24) NOT NULL UNIQUE,
  copies_on_hand  INTEGER NOT NULL DEFAULT 0 CHECK (copies_on_hand >= 0),
  shelf_code      VARCHAR(16),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_members (
  member_id       BIGSERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL CHECK (length(btrim(full_name)) > 0),
  membership_no   VARCHAR(32) NOT NULL UNIQUE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  password_hash   TEXT NOT NULL,
  joined_on       DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id     BIGSERIAL PRIMARY KEY,
  book_id         BIGINT NOT NULL REFERENCES library_books(book_id) ON DELETE CASCADE,
  member_id       BIGINT REFERENCES library_members(member_id) ON DELETE SET NULL,
  direction       VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  copies          INTEGER NOT NULL CHECK (copies > 0),
  note            TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_recorded_at
  ON stock_movements (recorded_at DESC, movement_id DESC);

CREATE INDEX IF NOT EXISTS idx_library_books_genre
  ON library_books (genre);
