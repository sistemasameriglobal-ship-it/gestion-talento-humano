-- =============================================================
-- SQL/10_DIAS_VACACIONES_TOMADOS_MANUAL.sql
-- -------------------------------------------------------------
-- Agrega columna para registrar los días de vacaciones que el
-- colaborador ya disfrutó o cobró en el pasado (histórico/ajuste manual),
-- permitiendo descontarlos de su saldo actual en un solo paso.
-- =============================================================

ALTER TABLE public.empleados 
ADD COLUMN IF NOT EXISTS dias_vacaciones_tomados_manual NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.empleados.dias_vacaciones_tomados_manual IS 
'Días de vacaciones tomados o compensados históricamente antes del registro en la app, para restar del saldo calculado por antigüedad.';
