-- =============================================================================
-- SQL 21: ELIMINACIÓN TOTAL DE REGISTROS PARA EMPLEADOS ESPECÍFICOS
-- =============================================================================
-- Colaboradores objetivo:
--   1. Kiara Yanessi Salazar Palacios
--   2. Yamiley Gómez Betancur
--   3. David Jose Brochero Rodriguez
--
-- Este script elimina en cascada TODOS los registros asociados a estas tres
-- personas en todas las tablas del sistema:
--   - public.novedades
--   - public.vacaciones
--   - public.procesos_disciplinarios
--   - public.productividad
--   - public.productividad_resumen
--   - public.cierre_meses
--   - public.registros_parqueadero
--   - public.empleado_periodos
--   - public.empleados
-- =============================================================================

DO $$
DECLARE
  v_nombres TEXT[] := ARRAY[
    'Kiara Yanessi Salazar Palacios',
    'Yamiley Gómez Betancur',
    'Yamiley Gomez Betancur',
    'David Jose Brochero Rodriguez',
    'David José Brochero Rodríguez'
  ];
  v_emp_ids UUID[];
BEGIN
  -- 1. Obtener los IDs de los empleados que coincidan por nombre o comodín
  SELECT ARRAY_AGG(id) INTO v_emp_ids
  FROM public.empleados
  WHERE 
    nombre_completo ILIKE '%Kiara%Salazar%'
    OR nombre_completo ILIKE '%Yamiley%G%mez%'
    OR nombre_completo ILIKE '%David%Brochero%';

  RAISE NOTICE 'IDs de empleados encontrados: %', v_emp_ids;

  -- 2. Eliminar de public.novedades
  DELETE FROM public.novedades
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 3. Eliminar de public.vacaciones
  DELETE FROM public.vacaciones
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 4. Eliminar de public.procesos_disciplinarios
  DELETE FROM public.procesos_disciplinarios
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 5. Eliminar de public.productividad
  DELETE FROM public.productividad
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 6. Eliminar de public.productividad_resumen
  DELETE FROM public.productividad_resumen
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 7. Eliminar de public.cierre_meses
  DELETE FROM public.cierre_meses
  WHERE 
    (v_emp_ids IS NOT NULL AND empleado_id = ANY(v_emp_ids))
    OR nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 8. Eliminar de public.registros_parqueadero
  DELETE FROM public.registros_parqueadero
  WHERE 
    nombre_empleado ILIKE '%Kiara%Salazar%'
    OR nombre_empleado ILIKE '%Yamiley%G%mez%'
    OR nombre_empleado ILIKE '%David%Brochero%';

  -- 9. Eliminar de public.empleado_periodos
  IF v_emp_ids IS NOT NULL AND array_length(v_emp_ids, 1) > 0 THEN
    DELETE FROM public.empleado_periodos
    WHERE empleado_id = ANY(v_emp_ids);
  END IF;

  -- 10. Eliminar de public.empleados
  DELETE FROM public.empleados
  WHERE 
    nombre_completo ILIKE '%Kiara%Salazar%'
    OR nombre_completo ILIKE '%Yamiley%G%mez%'
    OR nombre_completo ILIKE '%David%Brochero%';

  RAISE NOTICE 'Registros eliminados completamente con éxito.';
END $$;
