-- These 5 sessions are named "PERSONAL X" but were saved as session_type
-- 'fixed_group' by mistake, which made them show up in the Tablero's
-- "Grupos semana" view (which correctly filters by session_type alone).
-- Correcting the type, not the name.
UPDATE sessions
SET session_type = 'individual'
WHERE id IN (
  'b619c091-9ceb-4cad-9b75-00ccb7cb9689', -- PERSONAL 5 · Lunes 11:00
  'b69c1110-da5f-4e95-a220-c81b87b9ed2c', -- PERSONAL 6 · Lunes 12:00
  'ec3bcfc6-cfee-41a7-8e18-e63beec164cc', -- PERSONAL 4 · Miércoles 10:00
  '85b79fc0-55ae-4e50-a8a4-8b059b168894', -- PERSONAL 5 · Miércoles 11:00
  '228654b3-137e-4a35-afa4-60bb55574133'  -- PERSONAL 5 · Viernes 12:00
);
