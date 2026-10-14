-- =============================================================================
-- SQL 08: CONTINUIDAD LABORAL, ASCENSOS Y CAMBIOS DE CARGO
-- =============================================================================
-- Añade soporte en la tabla `public.empleado_periodos` para identificar
-- periodos que conservan continuidad jurídica/laboral con el periodo anterior:
--
--  1. `continuidad_laboral` (BOOLEAN):
--     - true: Mantiene antigüedad y saldo acumulado de vacaciones (ej. Ascenso / Cambio de cargo).
--     - false: Inicia nuevo ciclo desde cero (ej. Reintegro tras retiro externo).
--
--  2. `motivo_transicion` (TEXT):
--     - 'reintegro'      -> Reingreso tras retiro externo.
--     - 'ascenso'        -> Promoción o ascenso interno.
--     - 'cambio_cargo'   -> Cambio de posición o área con continuidad.
--     - 'inicio_contrato'-> Periodo inicial de contratación.
-- =============================================================================

ALTER TABLE public.empleado_periodos
  ADD COLUMN IF NOT EXISTS continuidad_laboral BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_transicion TEXT NOT NULL DEFAULT 'reintegro';

-- Índice para optimizar consultas de continuidad
CREATE INDEX IF NOT EXISTS idx_empleado_periodos_continuidad
  ON public.empleado_periodos (empleado_id, continuidad_laboral);
