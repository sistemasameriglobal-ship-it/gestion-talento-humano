-- =============================================================================
-- SQL/14_GESTION_EMPRESAS_DINAMICAS.sql
-- -----------------------------------------------------------------------------
-- Soporte para adición y configuración dinámica de nuevas empresas en el sistema.
-- Permite que los administradores creen empresas personalizadas y las utilicen
-- con el mismo nivel de integración que AmeriGlobal y Global Link.
-- =============================================================================

-- 1. Asegurar la tabla de empresas y sus columnas de identidad visual
CREATE TABLE IF NOT EXISTS public.empresas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           TEXT NOT NULL UNIQUE,
  nombre           TEXT NOT NULL,
  razon_social     TEXT,
  nit              TEXT,
  tagline          TEXT,
  logo_letra       TEXT,
  icono            TEXT DEFAULT '🏢',
  color_principal  TEXT DEFAULT '#2563EB',
  color_secundario TEXT DEFAULT '#1D4ED8',
  color_fondo_tag  TEXT DEFAULT '#EFF6FF',
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS razon_social TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nit TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_letra TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT '🏢';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS color_principal TEXT DEFAULT '#2563EB';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS color_secundario TEXT DEFAULT '#1D4ED8';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS color_fondo_tag TEXT DEFAULT '#EFF6FF';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_empresas_codigo ON public.empresas(codigo);
CREATE INDEX IF NOT EXISTS idx_empresas_activo ON public.empresas(activo);

-- 2. Insertar registros iniciales para AmeriGlobal y Global Link si no existen
INSERT INTO public.empresas (
  codigo, nombre, razon_social, tagline, logo_letra, icono, color_principal, color_secundario, color_fondo_tag, activo
)
VALUES
  (
    'ameriglobal',
    'AmeriGlobal',
    'AmeriGlobal S.A.S.',
    'Gestión Humana & Operaciones',
    'A',
    '🏢',
    '#2563EB',
    '#1E40AF',
    '#EFF6FF',
    TRUE
  ),
  (
    'global_link',
    'Global Link',
    'Global Link BPO S.A.S.',
    'Cobranza & Operaciones',
    'GL',
    '🌐',
    '#0D9488',
    '#0F766E',
    '#F0FDFA',
    TRUE
  )
ON CONFLICT (codigo) DO UPDATE SET
  razon_social = EXCLUDED.razon_social,
  tagline = EXCLUDED.tagline,
  logo_letra = EXCLUDED.logo_letra,
  icono = EXCLUDED.icono,
  color_principal = EXCLUDED.color_principal,
  color_secundario = EXCLUDED.color_secundario,
  color_fondo_tag = EXCLUDED.color_fondo_tag;

-- 3. Configurar RLS en public.empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver empresas activas" ON public.empresas;
CREATE POLICY "Usuarios autenticados pueden ver empresas activas"
  ON public.empresas
  FOR SELECT
  TO authenticated
  USING (activo = TRUE OR public.es_admin());

DROP POLICY IF EXISTS "Administradores pueden gestionar empresas" ON public.empresas;
CREATE POLICY "Administradores pueden gestionar empresas"
  ON public.empresas
  FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Otorgar permisos
GRANT SELECT ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO authenticated;
