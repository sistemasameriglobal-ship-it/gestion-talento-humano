-- =============================================================================
-- ELIMINAR EMPLEADO ESPECÍFICO Y SUS REGISTROS ASOCIADOS
-- Sistema de Talento Humano — AmeriGlobal & Global Link
-- =============================================================================
-- Colaborador a eliminar:
--   - Cédula / Documento: 1035431758
--   - Nombre: Rosa Nela Zú...
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

DO $$
DECLARE
  v_emp_id UUID;
  v_nombre TEXT;
BEGIN
  -- 1. Localizar el empleado por su documento o nombre
  SELECT id, nombre_completo 
  INTO v_emp_id, v_nombre
  FROM public.empleados
  WHERE numero_documento = '1035431758'
     OR nombre_completo ILIKE 'Rosa Nela Zú%'
  LIMIT 1;

  IF v_emp_id IS NULL THEN
    RAISE NOTICE 'No se encontró ningún empleado con documento 1035431758 o nombre Rosa Nela Zú...';
    RETURN;
  END IF;

  RAISE NOTICE 'Eliminando empleado: "%" (ID: %)', v_nombre, v_emp_id;

  -- 2. Eliminar novedades asociadas (por ID o por nombre)
  DELETE FROM public.novedades 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  -- 3. Eliminar vacaciones asociadas
  DELETE FROM public.vacaciones 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  -- 4. Eliminar procesos disciplinarios asociados
  DELETE FROM public.procesos_disciplinarios 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  -- 5. Eliminar periodos laborales
  DELETE FROM public.empleado_periodos 
  WHERE empleado_id = v_emp_id;

  -- 6. Eliminar registros de productividad (si existen)
  DELETE FROM public.productividad 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  DELETE FROM public.productividad_resumen 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  DELETE FROM public.cierre_meses 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  -- 7. Eliminar registros de parqueadero (si existen)
  DELETE FROM public.registros_parqueadero 
  WHERE empleado_id = v_emp_id 
     OR LOWER(TRIM(nombre_empleado)) = LOWER(TRIM(v_nombre));

  -- 8. Finalmente, eliminar el registro principal en la tabla empleados
  DELETE FROM public.empleados 
  WHERE id = v_emp_id;

  RAISE NOTICE 'El empleado "%" y todos sus registros vinculados fueron eliminados exitosamente.', v_nombre;
END $$;

-- -----------------------------------------------------------------------------
-- Comprobación: verificar que ya no exista
-- -----------------------------------------------------------------------------
SELECT id, nombre_completo, numero_documento, cargo, dependencia 
FROM public.empleados 
WHERE numero_documento = '1035431758' 
   OR nombre_completo ILIKE 'Rosa Nela Zú%';
