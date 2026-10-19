-- =============================================================================
-- SQL 09: SOPORTE DE DÍAS DECIMALES / FRACCIONADOS EN VACACIONES
-- =============================================================================
-- Permite registrar y acumular vacaciones con días decimales (ej. 7.5 días en dinero / 7.5 en tiempo)
-- sin truncamientos ni redondeos forzados a enteros.
-- =============================================================================

-- 1. Modificar columnas numéricas principales en public.vacaciones a NUMERIC(5,2)
ALTER TABLE public.vacaciones 
  ALTER COLUMN total_dias TYPE NUMERIC(5,2),
  ALTER COLUMN dias_disfrutados TYPE NUMERIC(5,2),
  ALTER COLUMN dias_en_dinero TYPE NUMERIC(5,2);

-- 2. Asegurar compatibilidad con nombres alternativos / alias solicitados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacaciones' AND column_name = 'dias_tiempo'
  ) THEN
    ALTER TABLE public.vacaciones ADD COLUMN dias_tiempo NUMERIC(5,2);
  ELSE
    ALTER TABLE public.vacaciones ALTER COLUMN dias_tiempo TYPE NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacaciones' AND column_name = 'dias_dinero'
  ) THEN
    ALTER TABLE public.vacaciones ADD COLUMN dias_dinero NUMERIC(5,2);
  ELSE
    ALTER TABLE public.vacaciones ALTER COLUMN dias_dinero TYPE NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacaciones' AND column_name = 'dias_solicitados'
  ) THEN
    ALTER TABLE public.vacaciones ADD COLUMN dias_solicitados NUMERIC(5,2);
  ELSE
    ALTER TABLE public.vacaciones ALTER COLUMN dias_solicitados TYPE NUMERIC(5,2);
  END IF;
END $$;

-- 3. Sincronizar automáticamente columnas alias en inserción/actualización
CREATE OR REPLACE FUNCTION public.trg_vacaciones_sync_decimales()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar días en tiempo
  IF NEW.dias_tiempo IS NULL AND NEW.dias_disfrutados IS NOT NULL THEN
    NEW.dias_tiempo := NEW.dias_disfrutados;
  ELSIF NEW.dias_disfrutados IS NULL AND NEW.dias_tiempo IS NOT NULL THEN
    NEW.dias_disfrutados := NEW.dias_tiempo;
  END IF;

  -- Sincronizar días en dinero
  IF NEW.dias_dinero IS NULL AND NEW.dias_en_dinero IS NOT NULL THEN
    NEW.dias_dinero := NEW.dias_en_dinero;
  ELSIF NEW.dias_en_dinero IS NULL AND NEW.dias_dinero IS NOT NULL THEN
    NEW.dias_en_dinero := NEW.dias_dinero;
  END IF;

  -- Sincronizar total / solicitados
  IF NEW.dias_solicitados IS NULL AND NEW.total_dias IS NOT NULL THEN
    NEW.dias_solicitados := NEW.total_dias;
  ELSIF NEW.total_dias IS NULL AND NEW.dias_solicitados IS NOT NULL THEN
    NEW.total_dias := NEW.dias_solicitados;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_vacaciones_decimales ON public.vacaciones;
CREATE TRIGGER trg_sync_vacaciones_decimales
  BEFORE INSERT OR UPDATE ON public.vacaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vacaciones_sync_decimales();
