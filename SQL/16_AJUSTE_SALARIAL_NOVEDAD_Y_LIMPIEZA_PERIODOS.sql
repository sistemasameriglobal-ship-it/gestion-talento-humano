-- =============================================================================
-- SQL 16: AJUSTE SALARIAL COMO NOVEDAD PURA + LIMPIEZA DE PERÍODOS VIGENTES
-- =============================================================================
-- Contexto:
--   A partir de esta versión, un "Ajuste Salarial" NO crea ni cierra períodos en
--   public.empleado_periodos. Solo actualiza empleados.salario / auxilio_transporte
--   y registra una novedad 'Ajuste Salarial' en public.novedades.
--
--   Este script:
--     1. Garantiza la columna motivo_retiro en empleado_periodos (usada al revertir).
--     2. Limpia notas residuales de transición en períodos VIGENTES
--        (ej. "Ajuste salarial contractual (Otrossí)") y cualquier fecha de retiro
--        que haya quedado grabada en un período marcado como actual.
-- =============================================================================

-- 1. Columna motivo_retiro (idempotente)
ALTER TABLE public.empleado_periodos
  ADD COLUMN IF NOT EXISTS motivo_retiro TEXT;

-- 2. Vista previa (opcional): períodos vigentes con texto residual
-- SELECT id, empleado_id, numero_periodo, fecha_retiro, observaciones
-- FROM public.empleado_periodos
-- WHERE es_periodo_actual = true
--   AND (
--     fecha_retiro IS NOT NULL
--     OR observaciones ~* '(Ajuste salarial|Ajuste contractual|Promovido a|Traslado a|Cierre por|Otross[ií])'
--   );

-- 3. Limpieza de períodos vigentes
UPDATE public.empleado_periodos
SET
  fecha_retiro  = NULL,
  motivo_retiro = NULL,
  observaciones = NULL,
  updated_at    = NOW()
WHERE es_periodo_actual = true
  AND (
    fecha_retiro IS NOT NULL
    OR observaciones ~* '(Ajuste salarial|Ajuste contractual|Promovido a|Traslado a|Cierre por|Otross[ií])'
  );
