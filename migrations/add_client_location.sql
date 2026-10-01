-- Free-text locality/city field for clients (e.g. Valencia, Alcoy, Cocentaina...)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS location TEXT;
