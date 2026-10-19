-- =============================================================================
-- SQL 15: EXPANDIR MOVIMIENTOS CONTRACTUALES, OTROSSÍ Y REVERSIÓN DE PERIODOS
-- =============================================================================
-- Permite registrar movimientos de continuidad laboral mediante Otrossí
-- (Ascenso, Ajuste de Rango/Área, Ajuste Salarial) sin desvincular al colaborador,
-- y garantiza soporte para eliminar/revertir periodos registrados por error.
-- =============================================================================

-- 1. Añadir columna salario a empleado_periodos si se desea registrar trazabilidad histórica del sueldo por periodo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'empleado_periodos' 
      AND column_name = 'salario'
  ) THEN
    ALTER TABLE public.empleado_periodos
      ADD COLUMN salario NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 2. Asegurar que las políticas de RLS permitan DELETE en empleado_periodos para administradores/editores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'empleado_periodos' 
      AND policyname = 'empleado_periodos_delete'
  ) THEN
    CREATE POLICY "empleado_periodos_delete"
      ON public.empleado_periodos
      FOR DELETE
      USING (true);
  END IF;
END $$;
