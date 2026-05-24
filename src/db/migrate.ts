import { pool } from './pool'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  google_id     TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  picture       TEXT,
  bearer_token  TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bearer_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
UPDATE users SET bearer_token = gen_random_uuid()::text WHERE bearer_token IS NULL;

CREATE TABLE IF NOT EXISTS sessions (
  sid    TEXT NOT NULL PRIMARY KEY,
  sess   JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions(expire);

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

CREATE TABLE IF NOT EXISTS recurring_templates (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  name       TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  category   TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  UNIQUE(user_id, category)
);

ALTER TABLE reminders      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE notebook_notes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE mindmaps       ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE vocabulary     ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE transactions   ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE etf_watchlist  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE mindmaps       ADD COLUMN IF NOT EXISTS edges JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS journal_entries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  date       DATE NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  went_well  TEXT[] NOT NULL DEFAULT '{}',
  went_bad   TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS foods (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id),
  name              TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'other',
  calories_per_100g INTEGER NOT NULL DEFAULT 0,
  emoji             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  date       DATE NOT NULL,
  meal_type  TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  items      JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, meal_type)
);

CREATE TABLE IF NOT EXISTS exercises (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id),
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('calisthenics','weights','cardio','flexibility')),
  muscle_groups  TEXT[] NOT NULL DEFAULT '{}',
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  name       TEXT NOT NULL,
  exercises  JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id),
  template_id  INTEGER REFERENCES workout_templates(id),
  date         DATE NOT NULL,
  sets         JSONB NOT NULL DEFAULT '[]',
  notes        TEXT,
  duration_min INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fitness_targets (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id),
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'reps',
  target_value  NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
`

export async function migrate() {
  await pool.query(SCHEMA)
  console.log('DB migration complete')
}
