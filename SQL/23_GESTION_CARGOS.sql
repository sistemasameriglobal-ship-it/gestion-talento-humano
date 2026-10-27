-- ==============================================================================
-- 23_GESTION_CARGOS.sql
-- ==============================================================================
-- Crea la tabla de cargos para la gestión dinámica desde la sección de Usuarios
-- y su integración directa en el expediente y movimientos de Empleados.
-- ==============================================================================

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS public.cargos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa      TEXT NOT NULL DEFAULT 'ameriglobal',
  nombre       TEXT NOT NULL,
  departamento TEXT,
  descripcion  TEXT,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar la restricción única por empresa y nombre
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_cargos_empresa_nombre'
  ) THEN
    ALTER TABLE public.cargos ADD CONSTRAINT uq_cargos_empresa_nombre UNIQUE (empresa, nombre);
  END IF;
END $$;

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_cargos_empresa ON public.cargos(empresa);
CREATE INDEX IF NOT EXISTS idx_cargos_activo  ON public.cargos(activo);
CREATE INDEX IF NOT EXISTS idx_cargos_nombre  ON public.cargos(nombre);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cargos_updated_at ON public.cargos;
CREATE TRIGGER trg_cargos_updated_at
  BEFORE UPDATE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Habilitar RLS y políticas
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.cargos;
CREATE POLICY "Permitir lectura a usuarios autenticados"
  ON public.cargos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir inserción a usuarios autenticados" ON public.cargos;
CREATE POLICY "Permitir inserción a usuarios autenticados"
  ON public.cargos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización a usuarios autenticados" ON public.cargos;
CREATE POLICY "Permitir actualización a usuarios autenticados"
  ON public.cargos FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir eliminación a usuarios autenticados" ON public.cargos;
CREATE POLICY "Permitir eliminación a usuarios autenticados"
  ON public.cargos FOR DELETE
  TO authenticated
  USING (true);

-- 5. Sembrar cargos iniciales estándar de forma segura
INSERT INTO public.cargos (empresa, nombre, departamento, descripcion, activo)
VALUES
  ('ameriglobal', 'ASESOR COMERCIAL', 'VENTAS', 'Gestión de ventas y atención comercial', true),
  ('ameriglobal', 'ANALISTA DE CARTERA', 'CIERRE', 'Gestión y recuperación de cartera', true),
  ('ameriglobal', 'ANALISTA DE UNDERWRITING', 'UNDERWRITING', 'Evaluación y suscripción de operaciones', true),
  ('ameriglobal', 'ANALISTA DE VERIFICACIÓN', 'VERIFICACION', 'Validación y verificación de documentos', true),
  ('ameriglobal', 'ANALISTA CONTABLE', 'CONTABILIDAD', 'Gestión contable, fiscal y tributaria', true),
  ('ameriglobal', 'COORDINADOR DE OPERACIONES', 'GERENCIA', 'Coordinación operativa general', true),
  ('ameriglobal', 'SUPERVISOR DE ÁREA', 'GERENCIA', 'Supervisión de equipos de trabajo', true),
  ('ameriglobal', 'ANALISTA DE RRHH', 'RRHH', 'Gestión de talento humano y nómina', true),
  ('ameriglobal', 'SOPORTE TI', 'SOPORTE TI', 'Soporte técnico e infraestructura', true),
  ('ameriglobal', 'SERVICIOS GENERALES', 'SERVICIOS GENERALES', 'Mantenimiento e higiene de instalaciones', true),
  ('ameriglobal', 'APRENDIZ ETAPA LECTIVA', 'APRENDIZ', 'Aprendiz SENA en etapa lectiva', true),
  ('ameriglobal', 'APRENDIZ ETAPA PRODUCTIVA', 'APRENDIZ', 'Aprendiz SENA en etapa práctica productiva', true),
  ('global_link', 'ASESOR DE COBRANZA', 'COBRANZA', 'Gestión telefónica de cobranzas', true),
  ('global_link', 'ANALISTA DE COBRANZA', 'COBRANZA', 'Análisis y seguimiento de cartera', true),
  ('global_link', 'SUPERVISOR DE COBRANZA', 'COBRANZA', 'Supervisión del equipo de cobranzas', true),
  ('global_link', 'COORDINADOR OPERATIVO', 'COBRANZA', 'Coordinación operativa', true)
ON CONFLICT (empresa, nombre) DO NOTHING;
