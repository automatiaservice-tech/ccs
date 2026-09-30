-- Tablero module: independent day-by-day session roster, decoupled from
-- session_clients (billing) so trainers can reshuffle participants for a
-- specific date without touching real billing/session data.

CREATE TABLE IF NOT EXISTS board_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_board_assignments_date ON board_assignments(date);

ALTER TABLE board_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access"
ON board_assignments
FOR ALL USING (auth.role() = 'authenticated');
