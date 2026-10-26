-- =============================================================================
-- SQL 22: ELIMINACIÓN TOTAL DE REGISTROS DE KEVIN ANDRES CORREA ROJAS
-- =============================================================================

DO $$
DECLARE
  v_emp_ids UUID[];
BEGIN
  -- 1. Obtener IDs del colaborador
  SELECT ARRAY_AGG(id) INTO v_emp_ids
  FROM public.empleados
  WHERE nombre_completo ILIKE '%Kevin%Correa%';

  -- 2. Eliminar de public.novedades
  DELETE FROM public.novedades
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kevin%Correa%';

  -- 3. Eliminar de public.vacaciones
  DELETE FROM public.vacaciones
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kevin%Correa%';

  -- 4. Eliminar de public.procesos_disciplinarios
  DELETE FROM public.procesos_disciplinarios
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kevin%Correa%';

  -- 5. Eliminar de public.productividad y productividad_resumen
  DELETE FROM public.productividad
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kevin%Correa%';

  DELETE FROM public.productividad_resumen
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kevin%Correa%';

  -- 6. Eliminar de public.cierre_meses
  DELETE FROM public.cierre_meses
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kevin%Correa%';

  -- 7. Eliminar de public.registros_parqueadero
  DELETE FROM public.registros_parqueadero
  WHERE nombre_empleado ILIKE '%Kevin%Correa%';

  -- 8. Eliminar de public.empleado_periodos
  IF v_emp_ids IS NOT NULL AND array_length(v_emp_ids, 1) > 0 THEN
    DELETE FROM public.empleado_periodos
    WHERE empleado_id = ANY(v_emp_ids);
  END IF;

  -- 9. Eliminar de public.empleados
  DELETE FROM public.empleados
  WHERE nombre_completo ILIKE '%Kevin%Correa%';

  RAISE NOTICE 'Registros de Kevin Andres Correa Rojas eliminados completamente.';
END $$;
