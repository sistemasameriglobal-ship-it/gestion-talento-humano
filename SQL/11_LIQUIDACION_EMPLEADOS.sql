-- =====================================================================
-- MIGRACIÓN 11: GESTIÓN DE LIQUIDACIÓN PARA EMPLEADOS INACTIVOS
-- Agrega campos de control de liquidación tanto en public.empleados
-- como en public.empleado_periodos para facilitar el seguimiento contable.
-- =====================================================================

ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS liquidado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_liquidacion DATE,
  ADD COLUMN IF NOT EXISTS observacion_liquidacion TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'empleado_periodos'
  ) THEN
    ALTER TABLE public.empleado_periodos
      ADD COLUMN IF NOT EXISTS liquidado BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS fecha_liquidacion DATE,
      ADD COLUMN IF NOT EXISTS observacion_liquidacion TEXT;
  END IF;
END $$;
