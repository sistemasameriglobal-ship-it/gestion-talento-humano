-- ==============================================================================
-- 25_CONTRATOS_COLUMNAS_Y_POLITICAS.sql
-- ==============================================================================
-- Añade soporte para columnas extendidas en la tabla contratos (dependencia, 
-- teléfono, correo) y ajusta las políticas RLS para garantizar inserción
-- y lectura sin restricciones para usuarios autenticados.
-- ==============================================================================

-- 1. Agregar columnas extendidas si no existen
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS dependencia TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS telefono_trabajador TEXT;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS email_trabajador TEXT;

-- 2. Asegurar que RLS esté habilitado y tenga políticas permisivas
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de contratos a usuarios autenticados" ON public.contratos;
DROP POLICY IF EXISTS "Permitir todos select contratos" ON public.contratos;
CREATE POLICY "Permitir todos select contratos"
  ON public.contratos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir inserción de contratos a usuarios autenticados" ON public.contratos;
DROP POLICY IF EXISTS "Permitir todos insert contratos" ON public.contratos;
CREATE POLICY "Permitir todos insert contratos"
  ON public.contratos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización de contratos a usuarios autenticados" ON public.contratos;
DROP POLICY IF EXISTS "Permitir todos update contratos" ON public.contratos;
CREATE POLICY "Permitir todos update contratos"
  ON public.contratos FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Permitir eliminación de contratos a usuarios autenticados" ON public.contratos;
DROP POLICY IF EXISTS "Permitir todos delete contratos" ON public.contratos;
CREATE POLICY "Permitir todos delete contratos"
  ON public.contratos FOR DELETE
  USING (true);

-- 3. Recargar la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
