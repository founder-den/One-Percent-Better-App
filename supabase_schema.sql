-- ─────────────────────────────────────────────────────────────────
--  supabase_schema.sql
--  Run this in the Supabase SQL Editor to create all missing tables.
--  Assumes the following tables already exist:
--    communities, groups, students
-- ─────────────────────────────────────────────────────────────────


-- ─── admin_settings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id                text    PRIMARY KEY DEFAULT 'main',
  admin_username    text    NOT NULL    DEFAULT 'admin',
  admin_password    text    NOT NULL    DEFAULT 'admin1',
  registration_mode text    NOT NULL    DEFAULT 'open',
  programs_label    text    NOT NULL    DEFAULT 'Programs'
);

-- Seed the single settings row (idempotent)
INSERT INTO admin_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON admin_settings;
CREATE POLICY "anon_all" ON admin_settings FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── activities ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id        text    PRIMARY KEY,
  group_id  text    NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name      text    NOT NULL,
  points    integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON activities;
CREATE POLICY "anon_all" ON activities FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── periods ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS periods (
  id                  text    PRIMARY KEY,
  group_id            text    NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name                text    NOT NULL,
  start_date          date,
  end_date            date,
  is_active           boolean NOT NULL DEFAULT false,
  count_for_all_time  boolean NOT NULL DEFAULT false,
  prize_text          text    NOT NULL DEFAULT ''
);

ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON periods;
CREATE POLICY "anon_all" ON periods FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── submissions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id                   text    PRIMARY KEY,
  student_id           text    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date                 date    NOT NULL,
  completed_activities jsonb   NOT NULL DEFAULT '[]',
  quote                text    NOT NULL DEFAULT '',
  quote_likes          jsonb   NOT NULL DEFAULT '[]',
  UNIQUE (student_id, date)
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON submissions;
CREATE POLICY "anon_all" ON submissions FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── bonus_points ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonus_points (
  id         text    PRIMARY KEY,
  student_id text    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       date    NOT NULL,
  points     integer NOT NULL DEFAULT 0,
  reason     text    NOT NULL DEFAULT ''
);

ALTER TABLE bonus_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON bonus_points;
CREATE POLICY "anon_all" ON bonus_points FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── global_tasbihs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_tasbihs (
  id              text    PRIMARY KEY,
  title           text    NOT NULL,
  description     text    NOT NULL DEFAULT '',
  target          integer NOT NULL DEFAULT 100,
  current         integer NOT NULL DEFAULT 0,
  completed_times integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  group_scope     text    NOT NULL DEFAULT 'all'
);

ALTER TABLE global_tasbihs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON global_tasbihs;
CREATE POLICY "anon_all" ON global_tasbihs FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── personal_tasbih_templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_tasbih_templates (
  id          text    PRIMARY KEY,
  title       text    NOT NULL,
  description text    NOT NULL DEFAULT '',
  target      integer NOT NULL DEFAULT 100,
  group_scope text    NOT NULL DEFAULT 'all',
  is_active   boolean NOT NULL DEFAULT true
);

ALTER TABLE personal_tasbih_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON personal_tasbih_templates;
CREATE POLICY "anon_all" ON personal_tasbih_templates FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── books ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id           text    PRIMARY KEY,
  student_id   text    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title        text    NOT NULL DEFAULT '',
  author       text    NOT NULL DEFAULT '',
  total_pages  integer NOT NULL DEFAULT 0,
  current_page integer NOT NULL DEFAULT 0,
  status       text    NOT NULL DEFAULT 'reading',
  started_date  date,
  finished_date date
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON books;
CREATE POLICY "anon_all" ON books FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── programs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id          text    PRIMARY KEY,
  name        text    NOT NULL,
  description text    NOT NULL DEFAULT '',
  date        date,
  group_scope text    NOT NULL DEFAULT 'all',
  is_active   boolean NOT NULL DEFAULT true,
  tasks       jsonb   NOT NULL DEFAULT '[]'
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON programs;
CREATE POLICY "anon_all" ON programs FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── program_completions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_completions (
  id         text    PRIMARY KEY,
  student_id text    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  program_id text    NOT NULL,
  task_id    text    NOT NULL,
  is_done    boolean NOT NULL DEFAULT false,
  count      integer NOT NULL DEFAULT 0,
  UNIQUE (student_id, task_id)
);

ALTER TABLE program_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON program_completions;
CREATE POLICY "anon_all" ON program_completions FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── collective_task_counts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS collective_task_counts (
  task_id         text    PRIMARY KEY,
  count           integer NOT NULL DEFAULT 0,
  completed_times integer NOT NULL DEFAULT 0
);

ALTER TABLE collective_task_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON collective_task_counts;
CREATE POLICY "anon_all" ON collective_task_counts FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── Grant table-level permissions to anon role ──────────────────
-- (Supabase usually grants these automatically, but listed here for
--  completeness in case you use a non-default Supabase setup.)
GRANT ALL ON admin_settings              TO anon;
GRANT ALL ON activities                  TO anon;
GRANT ALL ON periods                     TO anon;
GRANT ALL ON submissions                 TO anon;
GRANT ALL ON bonus_points                TO anon;
GRANT ALL ON global_tasbihs              TO anon;
GRANT ALL ON personal_tasbih_templates   TO anon;
GRANT ALL ON books                       TO anon;
GRANT ALL ON programs                    TO anon;
GRANT ALL ON program_completions         TO anon;
GRANT ALL ON collective_task_counts      TO anon;


-- ─── Column additions for tasbih reset types ────────────────────
-- Run these if you created the tables before the reset-type feature
-- was added. Safe to re-run (IF NOT EXISTS guards are handled by
-- checking the information_schema, but ALTER TABLE ADD COLUMN is
-- idempotent in Postgres 9.6+ with IF NOT EXISTS).

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS personal_tasbihs jsonb DEFAULT '[]';

ALTER TABLE global_tasbihs
  ADD COLUMN IF NOT EXISTS reset_type       text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_reset_date  text DEFAULT '';

ALTER TABLE personal_tasbih_templates
  ADD COLUMN IF NOT EXISTS reset_type text DEFAULT 'none';


-- ─── Enable Realtime for live subscriptions ──────────────────────
-- Run these in the Supabase Dashboard → Database → Replication,
-- OR via SQL (requires superuser):
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE global_tasbihs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE students;
-- ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
--
-- If you don't have superuser access, enable them in the Supabase
-- Dashboard under Database → Replication → Tables.


-- ─── challenges ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id                text      PRIMARY KEY,
  name              text      NOT NULL,
  description       text      DEFAULT '',
  code              text,
  is_private        boolean   DEFAULT false,
  is_visible        boolean   DEFAULT false,
  visible_to_groups jsonb     DEFAULT '[]',
  start_date        text      DEFAULT '',
  end_date          text      DEFAULT '',
  is_active         boolean   DEFAULT true,
  activities        jsonb     DEFAULT '[]',
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_memberships (
  id           text        PRIMARY KEY,
  challenge_id text        REFERENCES challenges(id) ON DELETE CASCADE,
  student_id   text,
  joined_at    timestamptz DEFAULT now()
);

ALTER TABLE challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON challenges;
DROP POLICY IF EXISTS "anon_all" ON challenge_memberships;

CREATE POLICY "anon_all" ON challenges            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON challenge_memberships FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON challenges            TO anon;
GRANT ALL ON challenge_memberships TO anon;

NOTIFY pgrst, 'reload schema';


-- ─── Challenge periods column ─────────────────────────────────────────
-- Run in Supabase SQL Editor to add per-challenge periods support:
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS periods jsonb DEFAULT '[]';

-- ─── Submission score override ────────────────────────────────────────
-- Run in Supabase SQL Editor to allow admin score overrides on submissions:
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS score_override numeric DEFAULT NULL;


-- ─── Migrate existing students → Ramadan Challenge ────────────────────
-- Run this in Supabase SQL Editor to add all existing students as members
-- of the Ramadan Challenge automatically:
--
-- INSERT INTO challenge_memberships (id, challenge_id, student_id, joined_at)
-- SELECT
--   'mem_' || students.id,
--   challenges.id,
--   students.id,
--   now()
-- FROM students
-- CROSS JOIN challenges
-- WHERE challenges.name = 'Ramadan Challenge'
-- ON CONFLICT DO NOTHING;
