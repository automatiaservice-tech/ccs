-- ============================================================
-- DIAGNÓSTICO: Buscar causa de borrado inesperado en session_clients
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. TRIGGERS EN LA TABLA invoices ────────────────────────────────────────
-- Si hay triggers aquí que tocan clients o session_clients, este es el bug.
SELECT
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  t.action_statement,
  t.action_orientation
FROM information_schema.triggers t
WHERE t.event_object_table = 'invoices'
ORDER BY t.trigger_name;

-- ── 2. TODOS LOS TRIGGERS DE LA BASE DE DATOS ───────────────────────────────
-- Para ver si hay algo inesperado en cualquier tabla.
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ── 3. FOREIGN KEYS CON CASCADE ─────────────────────────────────────────────
-- Verificar que las cascadas coinciden con el schema diseñado.
-- Lo esperado:
--   session_clients.client_id  → clients(id)   CASCADE  (correcto)
--   session_clients.session_id → sessions(id)  CASCADE  (correcto)
--   invoices.client_id         → clients(id)   CASCADE  (correcto)
--   invoice_lines.invoice_id   → invoices(id)  CASCADE  (correcto)
-- Si hay algo más aquí, ese es el problema.
SELECT
  tc.table_name         AS tabla,
  kcu.column_name       AS columna,
  ccu.table_name        AS referencia_tabla,
  ccu.column_name       AS referencia_columna,
  rc.delete_rule        AS on_delete
FROM information_schema.table_constraints        AS tc
JOIN information_schema.key_column_usage         AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage  AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints  AS rc  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ── 4. VERIFICAR ESTADO ACTUAL DE session_clients ───────────────────────────
-- Muestra cuántos clientes activos tiene cada sesión.
SELECT
  s.name                              AS sesion,
  CASE s.day_of_week
    WHEN 0 THEN 'Lunes'
    WHEN 1 THEN 'Martes'
    WHEN 2 THEN 'Miércoles'
    WHEN 3 THEN 'Jueves'
    WHEN 4 THEN 'Viernes'
    WHEN 5 THEN 'Sábado'
    ELSE 'Domingo'
  END                                 AS dia,
  s.session_type,
  COUNT(sc.client_id)                 AS clientes_asignados,
  STRING_AGG(c.name, ', ' ORDER BY c.name) AS clientes
FROM sessions s
LEFT JOIN session_clients sc ON sc.session_id = s.id
LEFT JOIN clients c ON c.id = sc.client_id
GROUP BY s.id, s.name, s.day_of_week, s.session_type
ORDER BY s.day_of_week, s.time;

-- ── 5. CLIENTES ACTIVOS SIN NINGUNA SESIÓN ASIGNADA ─────────────────────────
-- Estos son candidatos a ser clientes afectados por el bug.
SELECT
  c.id,
  c.name,
  c.profile_type,
  c.active
FROM clients c
WHERE c.active = true
  AND NOT EXISTS (
    SELECT 1 FROM session_clients sc WHERE sc.client_id = c.id
  )
ORDER BY c.profile_type, c.name;


-- ============================================================
-- RESTAURACIÓN: SQL para reinsertar session_clients perdidos
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecuta primero las queries de diagnóstico de arriba.
-- 2. Identifica qué clientes están sin sesión (query 5).
-- 3. Para cada cliente afectado, ejecuta el INSERT correspondiente
--    adaptando los UUIDs reales de cliente y sesión.

-- Ejemplo para reasignar UN cliente a UNA sesión:
-- INSERT INTO session_clients (session_id, client_id)
-- VALUES ('UUID-DE-LA-SESION', 'UUID-DEL-CLIENTE')
-- ON CONFLICT DO NOTHING;

-- Para ver los UUIDs de todas las sesiones disponibles:
SELECT id, name, day_of_week, time, session_type
FROM sessions
ORDER BY day_of_week, time;

-- Para ver los UUIDs de todos los clientes activos:
SELECT id, name, profile_type
FROM clients
WHERE active = true
ORDER BY profile_type, name;
