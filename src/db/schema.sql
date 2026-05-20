CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  name        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('bank', 'manual')),
  raw         TEXT,
  month       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_month ON transactions(month);

CREATE TABLE IF NOT EXISTS etf_watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker     TEXT NOT NULL UNIQUE,
  added_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  note       TEXT,
  due_at     TIMESTAMPTZ,
  repeat     TEXT NOT NULL DEFAULT 'none',
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notebook_notes (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT 'Untitled',
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mindmaps (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT 'My Mindmap',
  nodes      JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id           SERIAL PRIMARY KEY,
  word         TEXT NOT NULL,
  translation  TEXT NOT NULL,
  language     TEXT NOT NULL DEFAULT 'de',
  image_url    TEXT,
  example      TEXT,
  interval     INTEGER NOT NULL DEFAULT 1,
  repetitions  INTEGER NOT NULL DEFAULT 0,
  ease_factor  NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  due_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);
