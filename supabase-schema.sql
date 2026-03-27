-- ============================================================
-- CCS CENTER — Supabase SQL Schema
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE profile_type AS ENUM ('fixed_group', 'variable_group', 'individual');
CREATE TYPE session_type  AS ENUM ('fixed_group', 'variable_group', 'individual');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid');
CREATE TYPE expense_category AS ENUM ('alquiler', 'suministros', 'material', 'otros');

-- ============================================================
-- TABLES
-- ============================================================

-- clients
CREATE TABLE IF NOT EXISTS clients (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  profile_type profile_type NOT NULL,
  monthly_fee  NUMERIC(10, 2),
  notes        TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time          TIME NOT NULL,
  session_type  session_type NOT NULL,
  max_capacity  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- session_clients (N:M)
CREATE TABLE IF NOT EXISTS session_clients (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES clients(id)  ON DELETE CASCADE,
  PRIMARY KEY (session_id, client_id)
);

-- attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  attended        BOOLEAN NOT NULL DEFAULT FALSE,
  cost_per_person NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, date, client_id)
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  month          INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year           INTEGER NOT NULL,
  total_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status         invoice_status NOT NULL DEFAULT 'draft',
  pdf_url        TEXT,
  invoice_number TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, month, year)
);

-- invoice_lines
CREATE TABLE IF NOT EXISTS invoice_lines (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  attendees   INTEGER,
  amount      NUMERIC(10, 2) NOT NULL
);

-- expenses
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL,
  category    expense_category NOT NULL DEFAULT 'otros',
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;

-- Policies: only authenticated users (the admin) can access everything
CREATE POLICY "Authenticated users full access" ON clients
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON session_clients
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON attendance_records
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON invoice_lines
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA (datos de ejemplo)
-- ============================================================

-- Clients
INSERT INTO clients (name, phone, email, profile_type, monthly_fee, notes, active) VALUES
  ('María González',    '600 111 222', 'maria@email.com',   'fixed_group',    50.00, 'Entrena lunes y miércoles', true),
  ('Carlos Martínez',   '600 333 444', 'carlos@email.com',  'fixed_group',    50.00, NULL, true),
  ('Ana López',         '600 555 666', 'ana@email.com',     'fixed_group',    50.00, 'Principiante', true),
  ('Pedro Sánchez',     '600 777 888', 'pedro@email.com',   'variable_group', NULL,  NULL, true),
  ('Laura Fernández',   '600 999 000', 'laura@email.com',   'variable_group', NULL,  'Avanzada', true),
  ('Javier Ruiz',       '611 111 222', 'javier@email.com',  'variable_group', NULL,  NULL, true),
  ('Sofía Torres',      '611 333 444', 'sofia@email.com',   'individual',     NULL,  'Entrenamiento personal', true),
  ('Diego Herrera',     '611 555 666', 'diego@email.com',   'individual',     NULL,  NULL, true),
  ('Carmen Jiménez',    '611 777 888', 'carmen@email.com',  'fixed_group',    45.00, NULL, false);

-- Sessions
INSERT INTO sessions (name, day_of_week, time, session_type, max_capacity) VALUES
  ('Grupo Fijo — Mañana',          0, '09:00:00', 'fixed_group',    10),
  ('Grupo Variables — Tarde',      0, '18:00:00', 'variable_group', 8),
  ('Grupo Fijo — Mañana',          2, '09:00:00', 'fixed_group',    10),
  ('Grupo Variables — Tarde',      2, '18:00:00', 'variable_group', 8),
  ('Grupo Fijo — Mañana',          4, '09:00:00', 'fixed_group',    10),
  ('Entrenamiento Individual',     1, '10:00:00', 'individual',     1),
  ('Entrenamiento Individual',     3, '10:00:00', 'individual',     1);

-- session_clients (assign clients to sessions)
-- Get IDs dynamically. Run this block manually or adapt as needed.
-- Fixed group clients → fixed group sessions
INSERT INTO session_clients (session_id, client_id)
SELECT s.id, c.id
FROM sessions s, clients c
WHERE s.session_type = 'fixed_group'
  AND c.profile_type = 'fixed_group'
  AND c.active = true;

-- Variable group clients → variable group sessions
INSERT INTO session_clients (session_id, client_id)
SELECT s.id, c.id
FROM sessions s, clients c
WHERE s.session_type = 'variable_group'
  AND c.profile_type = 'variable_group'
  AND c.active = true;

-- Individual clients → individual sessions (one each)
INSERT INTO session_clients (session_id, client_id)
SELECT s.id, c.id
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM sessions WHERE session_type = 'individual'
) s
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM clients WHERE profile_type = 'individual' AND active = true
) c ON s.rn = c.rn;

-- Expenses (sample)
INSERT INTO expenses (description, amount, category, date) VALUES
  ('Alquiler local — Enero 2026',   800.00, 'alquiler',    '2026-01-01'),
  ('Electricidad enero',             95.50, 'suministros', '2026-01-15'),
  ('Material de entrenamiento',      120.00, 'material',   '2026-01-20'),
  ('Alquiler local — Febrero 2026', 800.00, 'alquiler',    '2026-02-01'),
  ('Electricidad febrero',           88.00, 'suministros', '2026-02-15'),
  ('Alquiler local — Marzo 2026',   800.00, 'alquiler',    '2026-03-01'),
  ('Electricidad marzo',             91.00, 'suministros', '2026-03-15'),
  ('Esterillas nuevas',              75.00, 'material',    '2026-03-10');
