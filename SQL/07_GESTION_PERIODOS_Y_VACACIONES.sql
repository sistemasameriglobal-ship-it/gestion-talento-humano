-- =============================================================================
-- SQL 07: GESTIÓN DE PERIODOS LABORALES, REINTEGROS Y VACACIONES
-- Sistema AmeriGlobal & Global Link
-- =============================================================================
-- Este script implementa:
--  1. Tabla `empleado_periodos` para trazabilidad de contratos y reintegros.
--  2. Políticas RLS de acceso con `usuario_activo()`.
--  3. Llave foránea `periodo_id` en la tabla `vacaciones`.
--  4. Backfill inicial para poblar el Periodo 1 de todos los empleados actuales.
-- =============================================================================

-- ── 1. CREACIÓN DE LA TABLA `empleado_periodos` ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.empleado_periodos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id       UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  empresa_id        UUID REFERENCES public.empresas(id),
  departamento_id   UUID REFERENCES public.departamentos(id),
  empresa           TEXT NOT NULL DEFAULT 'ameriglobal',
  numero_periodo    INTEGER NOT NULL DEFAULT 1,
  fecha_ingreso     DATE NOT NULL,
  fecha_retiro      DATE,
  observaciones     TEXT,
  cargo             TEXT,
  dependencia       TEXT,
  es_periodo_actual BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restricción de unicidad: un número de periodo por empleado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_empleado_periodo'
  ) THEN
    ALTER TABLE public.empleado_periodos
      ADD CONSTRAINT uq_empleado_periodo UNIQUE (empleado_id, numero_periodo);
  END IF;
END $$;

-- Índice único parcial: solo un periodo con es_periodo_actual = true por empleado
CREATE UNIQUE INDEX IF NOT EXISTS idx_empleado_un_solo_periodo_activo
  ON public.empleado_periodos (empleado_id)
  WHERE (es_periodo_actual = true);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_empleado_periodos_empleado_id
  ON public.empleado_periodos (empleado_id);

CREATE INDEX IF NOT EXISTS idx_empleado_periodos_empresa
  ON public.empleado_periodos (empresa);

CREATE INDEX IF NOT EXISTS idx_empleado_periodos_fechas
  ON public.empleado_periodos (fecha_ingreso, fecha_retiro);

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS trg_empleado_periodos_updated_at ON public.empleado_periodos;
CREATE TRIGGER trg_empleado_periodos_updated_at
  BEFORE UPDATE ON public.empleado_periodos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ── 2. AGREGAR `periodo_id` EN LA TABLA `vacaciones` ─────────────────────────
ALTER TABLE public.vacaciones
  ADD COLUMN IF NOT EXISTS periodo_id UUID REFERENCES public.empleado_periodos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vacaciones_periodo_id
  ON public.vacaciones (periodo_id);


-- ── 3. POLÍTICAS ROW LEVEL SECURITY (RLS) ────────────────────────────────────
ALTER TABLE public.empleado_periodos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empleado_periodos_acceso_usuario_activo" ON public.empleado_periodos;
CREATE POLICY "empleado_periodos_acceso_usuario_activo" ON public.empleado_periodos
  FOR ALL USING (public.usuario_activo()) WITH CHECK (public.usuario_activo());


-- ── 4. BACKFILL INICIAL (MIGRACIÓN DE DATOS EXISTENTES) ───────────────────────
-- Crea el Periodo 1 para todos los empleados que aún no tengan registros en empleado_periodos
INSERT INTO public.empleado_periodos (
  empleado_id,
  empresa_id,
  departamento_id,
  empresa,
  numero_periodo,
  fecha_ingreso,
  fecha_retiro,
  cargo,
  dependencia,
  es_periodo_actual,
  observaciones
)
SELECT
  e.id AS empleado_id,
  e.empresa_id,
  e.departamento_id,
  COALESCE(e.empresa, 'ameriglobal') AS empresa,
  1 AS numero_periodo,
  COALESCE(e.fecha_ingreso, e.created_at::date, CURRENT_DATE) AS fecha_ingreso,
  e.fecha_retiro,
  e.cargo,
  e.dependencia,
  COALESCE(e.activo, true) AS es_periodo_actual,
  'Periodo inicial migrado desde ficha de empleado' AS observaciones
FROM public.empleados e
WHERE NOT EXISTS (
  SELECT 1 FROM public.empleado_periodos ep WHERE ep.empleado_id = e.id
);

-- Enlazar solicitudes de vacaciones históricas con el periodo inicial correspondiente
UPDATE public.vacaciones v
SET periodo_id = ep.id
FROM public.empleado_periodos ep
WHERE v.empleado_id = ep.empleado_id
  AND v.periodo_id IS NULL
  AND ep.es_periodo_actual = true;
