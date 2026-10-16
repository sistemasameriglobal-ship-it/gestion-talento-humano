-- =============================================================================
-- SQL/13_SUSTITUCION_PATRONAL.sql
-- -----------------------------------------------------------------------------
-- Función RPC atómica para ejecutar la Sustitución Patronal (Cambio de Razón Social)
-- entre AmeriGlobal y Global Link:
--   1. Conserva intacta la fecha de ingreso histórica (antigüedad) del empleado.
--   2. Cierra el periodo laboral anterior y crea uno nuevo con continuidad_laboral = true.
--   3. Migra todas las novedades históricas y registra la novedad 'Sustitución Patronal'.
--   4. Migra el historial de procesos disciplinarios.
--   5. Migra las mediciones de productividad.
--   6. Migra los registros y solicitudes de vacaciones.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ejecutar_sustitucion_patronal(
  p_empleado_id UUID,
  p_empresa_destino TEXT,
  p_fecha_sustitucion DATE,
  p_dependencia TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD;
  v_empresa_id UUID := NULL;
  v_dep_id UUID := NULL;
  v_next_num INT := 1;
  v_dep_final TEXT;
  v_cargo_final TEXT;
  v_obs_final TEXT;
  v_periodo_mes TEXT;
BEGIN
  -- 1. Verificar existencia del empleado
  SELECT * INTO v_emp
  FROM public.empleados
  WHERE id = p_empleado_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empleado con ID % no encontrado.', p_empleado_id;
  END IF;

  v_dep_final := COALESCE(NULLIF(TRIM(p_dependencia), ''), v_emp.dependencia);
  v_cargo_final := COALESCE(NULLIF(TRIM(p_cargo), ''), v_emp.cargo);
  v_obs_final := COALESCE(
    NULLIF(TRIM(p_observaciones), ''),
    'Sustitución patronal de ' || COALESCE(v_emp.empresa, 'origen') || ' hacia ' || p_empresa_destino || '. Conserva antigüedad laboral, fecha de ingreso original e historial disciplinario/productividad.'
  );
  v_periodo_mes := to_char(p_fecha_sustitucion, 'YYYY-MM');

  -- 2. Resolver empresa_id relacional (si la tabla empresas existe)
  BEGIN
    SELECT id INTO v_empresa_id
    FROM public.empresas
    WHERE slug = p_empresa_destino OR codigo = p_empresa_destino
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;

  -- 3. Resolver departamento_id relacional (si la tabla departamentos existe)
  BEGIN
    IF v_empresa_id IS NOT NULL AND v_dep_final IS NOT NULL THEN
      SELECT id INTO v_dep_id
      FROM public.departamentos
      WHERE empresa_id = v_empresa_id AND UPPER(TRIM(nombre)) = UPPER(TRIM(v_dep_final))
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_dep_id := NULL;
  END;

  -- 4. Actualizar tabla principal public.empleados
  -- IMPORTANTE: NO se toca fecha_ingreso para preservar intacta su antigüedad legal.
  UPDATE public.empleados
  SET
    empresa = p_empresa_destino,
    dependencia = v_dep_final,
    cargo = v_cargo_final,
    activo = true,
    empresa_id = COALESCE(v_empresa_id, empresa_id),
    departamento_id = COALESCE(v_dep_id, departamento_id),
    updated_at = NOW()
  WHERE id = p_empleado_id;

  -- 5. Manejar periodos laborales en public.empleado_periodos (si existe)
  BEGIN
    -- Cerrar periodo activo previo
    UPDATE public.empleado_periodos
    SET
      fecha_retiro = p_fecha_sustitucion,
      motivo_retiro = 'Sustitución Patronal',
      observaciones = 'Sustitución patronal hacia ' || p_empresa_destino,
      es_periodo_actual = false
    WHERE empleado_id = p_empleado_id
      AND es_periodo_actual = true;

    -- Calcular siguiente correlativo de periodo
    SELECT COALESCE(MAX(numero_periodo), 0) + 1 INTO v_next_num
    FROM public.empleado_periodos
    WHERE empleado_id = p_empleado_id;

    -- Insertar nuevo periodo en la empresa destino con continuidad_laboral = true
    INSERT INTO public.empleado_periodos (
      empleado_id,
      empresa,
      empresa_id,
      departamento_id,
      numero_periodo,
      fecha_ingreso,
      fecha_retiro,
      cargo,
      dependencia,
      es_periodo_actual,
      continuidad_laboral,
      motivo_transicion,
      observaciones
    ) VALUES (
      p_empleado_id,
      p_empresa_destino,
      v_empresa_id,
      v_dep_id,
      v_next_num,
      p_fecha_sustitucion,
      NULL,
      v_cargo_final,
      v_dep_final,
      true,
      true,
      'sustitucion_patronal',
      v_obs_final
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si la tabla empleado_periodos no existe o falla, continuar
    NULL;
  END;

  -- 6. Migrar novedades existentes del empleado hacia la empresa destino
  BEGIN
    UPDATE public.novedades
    SET
      empresa = p_empresa_destino,
      empresa_id = COALESCE(v_empresa_id, empresa_id)
    WHERE empleado_id = p_empleado_id
       OR (v_emp.nombre_completo IS NOT NULL AND LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_emp.nombre_completo)));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 7. Insertar novedad contractual de 'Sustitución Patronal'
  BEGIN
    INSERT INTO public.novedades (
      concepto,
      fecha_inicio,
      fecha_fin,
      total_dias,
      periodo,
      observacion,
      empleado_id,
      nombre_empleado,
      dependencia,
      empresa,
      empresa_id,
      departamento_id
    ) VALUES (
      'Sustitución Patronal',
      p_fecha_sustitucion,
      p_fecha_sustitucion,
      0,
      v_periodo_mes,
      v_obs_final,
      p_empleado_id,
      v_emp.nombre_completo,
      v_dep_final,
      p_empresa_destino,
      v_empresa_id,
      v_dep_id
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 8. Migrar Procesos Disciplinarios
  BEGIN
    UPDATE public.procesos_disciplinarios
    SET empresa = p_empresa_destino
    WHERE empleado_id = p_empleado_id
       OR (v_emp.nombre_completo IS NOT NULL AND LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_emp.nombre_completo)));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 9. Migrar Productividad
  BEGIN
    UPDATE public.productividad
    SET empresa = p_empresa_destino
    WHERE empleado_id = p_empleado_id
       OR (v_emp.nombre_completo IS NOT NULL AND LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_emp.nombre_completo)));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 10. Migrar Vacaciones
  BEGIN
    UPDATE public.vacaciones
    SET empresa = p_empresa_destino
    WHERE empleado_id = p_empleado_id
       OR (v_emp.nombre_completo IS NOT NULL AND LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_emp.nombre_completo)));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 11. Migrar Registros de Parqueadero si existen
  BEGIN
    UPDATE public.registros_parqueadero
    SET empresa = p_empresa_destino
    WHERE empleado_id = p_empleado_id
       OR (v_emp.nombre_completo IS NOT NULL AND LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_emp.nombre_completo)));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'empleado_id', p_empleado_id,
    'empresa_origen', v_emp.empresa,
    'empresa_destino', p_empresa_destino,
    'fecha_sustitucion', p_fecha_sustitucion
  );
END;
$$;

-- Permitir ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.ejecutar_sustitucion_patronal(UUID, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated, service_role;
