-- ============================================================
-- Migración: precio sesión, método de pago y cuenta bancaria
-- Ejecutar en el dashboard de Supabase → SQL Editor
-- ============================================================

-- 1. Precio por sesión en sessions (por defecto 40€)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_price NUMERIC(10,2) DEFAULT 40;

-- 2. Método y referencia de pago en invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('efectivo', 'transferencia'));

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- 3. Cuenta bancaria en clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS bank_account TEXT;
