-- =====================================================================
-- MIGRACIÓN 19: CORREGIR FECHAS DE NOVEDADES CON CONCEPTO 'Ingreso'
-- ---------------------------------------------------------------------
-- Corrige las novedades de tipo 'Ingreso' que tengan registrada la
-- fecha en la que se creó el registro o fecha de hoy (created_at::date),
-- actualizándolas a la fecha_ingreso real del colaborador (tomada de
-- fecha_inicio_empresa_actual, fecha_ingreso, o primer periodo laboral).
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE 'Iniciando corrección de fechas de novedades de Ingreso...';

  -- 1. Asegurar columna cargo en novedades si no existiera
  ALTER TABLE public.novedades ADD COLUMN IF NOT EXISTS cargo text;

  -- 2. Actualizar fecha_inicio, fecha_fin y periodo de novedades con concepto 'Ingreso'
  UPDATE public.novedades n
  SET
    fecha_inicio = COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso),
    fecha_fin = COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso),
    periodo = TO_CHAR(COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso)::date, 'YYYY-MM'),
    cargo = COALESCE(n.cargo, e.cargo),
    dependencia = COALESCE(n.dependencia, e.dependencia)
  FROM public.empleados e
  LEFT JOIN LATERAL (
    SELECT ep.fecha_ingreso
    FROM public.empleado_periodos ep
    WHERE ep.empleado_id = e.id AND ep.fecha_ingreso IS NOT NULL
    ORDER BY ep.numero_periodo ASC
    LIMIT 1
  ) p ON true
  WHERE n.concepto = 'Ingreso'
    AND (n.empleado_id = e.id OR LOWER(TRIM(n.nombre_empleado)) = LOWER(TRIM(e.nombre_completo)))
    AND COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso) IS NOT NULL
    AND n.fecha_inicio IS DISTINCT FROM COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso);

  RAISE NOTICE 'Corrección de fechas de Ingreso completada con éxito.';
END $$;
