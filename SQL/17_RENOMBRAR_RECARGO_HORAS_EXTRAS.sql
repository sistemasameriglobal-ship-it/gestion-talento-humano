-- =============================================================================
-- SQL 17: ACTUALIZAR CONCEPTO "Recargo Dominical o Festivos" A "Horas extras con recargos"
-- =============================================================================
-- Contexto:
--   Se actualiza el nombre del concepto en la tabla public.novedades
--   para que todos los registros históricos reflejen la nueva denominación oficial:
--   "Horas extras con recargos".
-- =============================================================================

-- 1. Vista previa de registros a actualizar (opcional para auditoría)
SELECT id, nombre_empleado, concepto, fecha_inicio, fecha_fin, total_dias, created_at
FROM public.novedades
WHERE TRIM(concepto) ILIKE 'Recargo Dominical o Festivos';

-- 2. Migración / Actualización del concepto histórico
UPDATE public.novedades
SET
  concepto = 'Horas extras con recargos'
WHERE TRIM(concepto) ILIKE 'Recargo Dominical o Festivos';

-- 3. Verificación posterior
SELECT count(*) AS total_actualizados
FROM public.novedades
WHERE concepto = 'Horas extras con recargos';
