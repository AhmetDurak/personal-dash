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
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS translation_language TEXT NOT NULL DEFAULT 'tr';

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
  name_de           TEXT,
  name_tr           TEXT,
  category          TEXT NOT NULL DEFAULT 'other',
  calories_per_100g INTEGER NOT NULL DEFAULT 0,
  emoji             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS name_de TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS name_tr TEXT;

-- Deduplicate global foods before adding unique index
DELETE FROM foods
WHERE user_id IS NULL
  AND id NOT IN (
    SELECT MIN(id) FROM foods WHERE user_id IS NULL GROUP BY name
  );

CREATE UNIQUE INDEX IF NOT EXISTS foods_global_name_unique ON foods(name) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS foods_user_name_unique   ON foods(name, user_id) WHERE user_id IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS shopping_list (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) UNIQUE,
  items      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopping_sessions (
  user_id    INTEGER REFERENCES users(id),
  date       TEXT NOT NULL,
  items      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS receipt_uploads (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  date        TEXT NOT NULL,
  filename    TEXT NOT NULL,
  orig_name   TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
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

CREATE TABLE IF NOT EXISTS daily_plans (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  date       DATE NOT NULL,
  tasks      JSONB NOT NULL DEFAULT '[]',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS language_sentences (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id),
  source_text  TEXT NOT NULL DEFAULT '',
  translation  TEXT,
  source_lang  TEXT NOT NULL DEFAULT 'de',
  target_lang  TEXT NOT NULL DEFAULT 'tr',
  word_links   JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lang_sentences_user ON language_sentences(user_id);

CREATE TABLE IF NOT EXISTS language_scenarios (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id),
  title        TEXT NOT NULL DEFAULT 'Untitled',
  content      TEXT NOT NULL DEFAULT '',
  source_lang  TEXT NOT NULL DEFAULT 'de',
  target_lang  TEXT NOT NULL DEFAULT 'tr',
  word_links   JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lang_scenarios_user ON language_scenarios(user_id);

CREATE TABLE IF NOT EXISTS challenges (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id),
  scope          TEXT NOT NULL DEFAULT 'general',
  title          TEXT NOT NULL,
  description    TEXT,
  target_value   NUMERIC,
  target_unit    TEXT,
  start_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date       DATE,
  repeat_cycle   TEXT NOT NULL DEFAULT 'none',
  status         TEXT NOT NULL DEFAULT 'active',
  checkpoints    JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenges(user_id);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS time_of_day TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS repeat_days TEXT;

CREATE TABLE IF NOT EXISTS body_weight (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  date       DATE NOT NULL,
  weight_kg  NUMERIC(5,2) NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_body_weight_user ON body_weight(user_id);

-- Spaced repetition + memory palace for language sentences (idempotent ALTER)
ALTER TABLE language_sentences ADD COLUMN IF NOT EXISTS interval     INTEGER  NOT NULL DEFAULT 1;
ALTER TABLE language_sentences ADD COLUMN IF NOT EXISTS repetitions  INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE language_sentences ADD COLUMN IF NOT EXISTS ease_factor  NUMERIC  NOT NULL DEFAULT 2.5;
ALTER TABLE language_sentences ADD COLUMN IF NOT EXISTS due_at       DATE     NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE language_sentences ADD COLUMN IF NOT EXISTS memory_palace TEXT;
ALTER TABLE language_sentences ADD COLUMN IF NOT EXISTS image_url    TEXT;

-- Spaced repetition + memory palace for language scenarios (idempotent ALTER)
ALTER TABLE language_scenarios ADD COLUMN IF NOT EXISTS interval     INTEGER  NOT NULL DEFAULT 1;
ALTER TABLE language_scenarios ADD COLUMN IF NOT EXISTS repetitions  INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE language_scenarios ADD COLUMN IF NOT EXISTS ease_factor  NUMERIC  NOT NULL DEFAULT 2.5;
ALTER TABLE language_scenarios ADD COLUMN IF NOT EXISTS due_at       DATE     NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE language_scenarios ADD COLUMN IF NOT EXISTS memory_palace TEXT;

-- Folders for notes and mindmaps
ALTER TABLE notebook_notes ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT NULL;
ALTER TABLE mindmaps       ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT NULL;

-- Extended category/subcategory system
ALTER TABLE transactions        ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;
ALTER TABLE recurring_templates ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;

-- Weekly training schedule (day_of_week: 0=Mon..6=Sun)
CREATE TABLE IF NOT EXISTS training_schedules (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id),
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  name         TEXT NOT NULL,
  template_id  INTEGER REFERENCES workout_templates(id),
  duration_min INTEGER,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_schedules_user ON training_schedules(user_id);
ALTER TABLE training_schedules ADD COLUMN IF NOT EXISTS exercise_id  INTEGER REFERENCES exercises(id);
ALTER TABLE training_schedules ADD COLUMN IF NOT EXISTS sets_count   INTEGER;
ALTER TABLE training_schedules ADD COLUMN IF NOT EXISTS reps         INTEGER;
ALTER TABLE training_schedules ADD COLUMN IF NOT EXISTS weight_kg    NUMERIC(6,2);

-- Migrate old category values to new German parent categories
UPDATE transactions SET category = CASE category
  WHEN 'Income'            THEN 'Einkommen'
  WHEN 'Salary'            THEN 'Einkommen'
  WHEN 'Freelance'         THEN 'Einkommen'
  WHEN 'Investment Income' THEN 'Sparen und Anlagen'
  WHEN 'Other Income'      THEN 'Einkommen'
  WHEN 'Fixed'             THEN 'Wohnen'
  WHEN 'Market'            THEN 'Lebenshaltung'
  WHEN 'Health'            THEN 'Gesundheit'
  WHEN 'Investment'        THEN 'Sparen und Anlagen'
  WHEN 'Education'         THEN 'Beruf und Bildung'
  WHEN 'Entertainment'     THEN 'Freizeit und Reise'
  WHEN 'Others'            THEN 'Sonstige'
  ELSE category
END
WHERE category IN ('Income','Salary','Freelance','Investment Income','Other Income',
                   'Fixed','Market','Health','Investment','Education','Entertainment','Others');

UPDATE recurring_templates SET category = CASE category
  WHEN 'Income'            THEN 'Einkommen'
  WHEN 'Salary'            THEN 'Einkommen'
  WHEN 'Freelance'         THEN 'Einkommen'
  WHEN 'Investment Income' THEN 'Sparen und Anlagen'
  WHEN 'Other Income'      THEN 'Einkommen'
  WHEN 'Fixed'             THEN 'Wohnen'
  WHEN 'Market'            THEN 'Lebenshaltung'
  WHEN 'Health'            THEN 'Gesundheit'
  WHEN 'Investment'        THEN 'Sparen und Anlagen'
  WHEN 'Education'         THEN 'Beruf und Bildung'
  WHEN 'Entertainment'     THEN 'Freizeit und Reise'
  WHEN 'Others'            THEN 'Sonstige'
  ELSE category
END
WHERE category IN ('Income','Salary','Freelance','Investment Income','Other Income',
                   'Fixed','Market','Health','Investment','Education','Entertainment','Others');

UPDATE budgets SET category = CASE category
  WHEN 'Income'            THEN 'Einkommen'
  WHEN 'Salary'            THEN 'Einkommen'
  WHEN 'Freelance'         THEN 'Einkommen'
  WHEN 'Investment Income' THEN 'Sparen und Anlagen'
  WHEN 'Other Income'      THEN 'Einkommen'
  WHEN 'Fixed'             THEN 'Wohnen'
  WHEN 'Market'            THEN 'Lebenshaltung'
  WHEN 'Health'            THEN 'Gesundheit'
  WHEN 'Investment'        THEN 'Sparen und Anlagen'
  WHEN 'Education'         THEN 'Beruf und Bildung'
  WHEN 'Entertainment'     THEN 'Freizeit und Reise'
  WHEN 'Others'            THEN 'Sonstige'
  ELSE category
END
WHERE category IN ('Income','Salary','Freelance','Investment Income','Other Income',
                   'Fixed','Market','Health','Investment','Education','Entertainment','Others');
`

// [name, category, kcal/100g, emoji, name_de, name_tr]
const GLOBAL_FOODS: [string, string, number, string, string, string][] = [
  // Protein
  ['Chicken Breast',       'protein',  165, '🍗', 'Hähnchenbrust',          'Tavuk Göğsü'],
  ['Eggs',                 'protein',  155, '🥚', 'Eier',                   'Yumurta'],
  ['Salmon',               'protein',  208, '🐟', 'Lachs',                  'Somon'],
  ['Tuna',                 'protein',  132, '🐟', 'Thunfisch',              'Ton Balığı'],
  ['Ground Beef',          'protein',  250, '🥩', 'Hackfleisch',            'Kıyma'],
  ['Tofu',                 'protein',   76, '🫘', 'Tofu',                   'Tofu'],
  ['Lentils (cooked)',     'protein',  116, '🫘', 'Linsen (gekocht)',        'Mercimek (pişmiş)'],
  ['Shrimp',               'protein',   99, '🦐', 'Garnelen',               'Karides'],
  // Carbs
  ['Brown Rice (cooked)',  'carbs',    216, '🍚', 'Brauner Reis (gekocht)', 'Esmer Pirinç (pişmiş)'],
  ['White Rice (cooked)',  'carbs',    130, '🍚', 'Weißer Reis (gekocht)',  'Beyaz Pirinç (pişmiş)'],
  ['Oats',                 'carbs',    389, '🌾', 'Haferflocken',           'Yulaf'],
  ['Whole Wheat Bread',    'carbs',    247, '🍞', 'Vollkornbrot',           'Tam Buğday Ekmeği'],
  ['Pasta (cooked)',       'carbs',    158, '🍝', 'Nudeln (gekocht)',        'Makarna (pişmiş)'],
  ['Potato (boiled)',      'carbs',     77, '🥔', 'Kartoffel (gekocht)',    'Patates (haşlanmış)'],
  ['Sweet Potato (baked)', 'carbs',     90, '🍠', 'Süßkartoffel (gebacken)','Tatlı Patates (fırında)'],
  ['Quinoa (cooked)',      'carbs',    120, '🌾', 'Quinoa (gekocht)',        'Kinoa (pişmiş)'],
  // Vegetables
  ['Broccoli',             'vegetable', 34, '🥦', 'Brokkoli',               'Brokoli'],
  ['Spinach',              'vegetable', 23, '🥬', 'Spinat',                 'Ispanak'],
  ['Carrot',               'vegetable', 41, '🥕', 'Karotte',                'Havuç'],
  ['Tomato',               'vegetable', 18, '🍅', 'Tomate',                 'Domates'],
  ['Cucumber',             'vegetable', 16, '🥒', 'Gurke',                  'Salatalık'],
  ['Bell Pepper',          'vegetable', 31, '🫑', 'Paprika',                'Biber'],
  ['Zucchini',             'vegetable', 17, '🥒', 'Zucchini',               'Kabak'],
  ['Onion',                'vegetable', 40, '🧅', 'Zwiebel',                'Soğan'],
  // Fruit
  ['Banana',               'fruit',     89, '🍌', 'Banane',                 'Muz'],
  ['Apple',                'fruit',     52, '🍎', 'Apfel',                  'Elma'],
  ['Orange',               'fruit',     47, '🍊', 'Orange',                 'Portakal'],
  ['Strawberries',         'fruit',     32, '🍓', 'Erdbeeren',              'Çilek'],
  ['Blueberries',          'fruit',     57, '🫐', 'Blaubeeren',             'Yaban Mersini'],
  ['Grapes',               'fruit',     67, '🍇', 'Trauben',                'Üzüm'],
  // Dairy
  ['Greek Yogurt',         'dairy',     97, '🥛', 'Griechischer Joghurt',   'Yunan Yoğurdu'],
  ['Cottage Cheese',       'dairy',     98, '🧀', 'Hüttenkäse',             'Lor Peyniri'],
  ['Milk (whole)',         'dairy',     61, '🥛', 'Vollmilch',              'Tam Yağlı Süt'],
  ['Cheddar Cheese',       'dairy',    403, '🧀', 'Cheddar-Käse',           'Çedar Peyniri'],
  // Fat
  ['Olive Oil',            'fat',      884, '🫒', 'Olivenöl',               'Zeytinyağı'],
  ['Avocado',              'fat',      160, '🥑', 'Avocado',                'Avokado'],
  ['Mixed Nuts',           'fat',      607, '🥜', 'Gemischte Nüsse',        'Karışık Kuruyemiş'],
  ['Peanut Butter',        'fat',      588, '🥜', 'Erdnussbutter',          'Fıstık Ezmesi'],
  ['Almonds',              'fat',      579, '🫘', 'Mandeln',                'Badem'],
]

export async function migrate() {
  await pool.query(SCHEMA)
  console.log('DB migration complete')

  // Seed global default foods (user_id = NULL) — idempotent; upsert translations
  for (const [name, category, calories, emoji, name_de, name_tr] of GLOBAL_FOODS) {
    await pool.query(
      `INSERT INTO foods (name, category, calories_per_100g, emoji, name_de, name_tr, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,NULL)
       ON CONFLICT (name) WHERE user_id IS NULL DO UPDATE
         SET name_de = EXCLUDED.name_de, name_tr = EXCLUDED.name_tr`,
      [name, category, calories, emoji, name_de, name_tr]
    )
  }
  console.log('Global foods seeded')
}
