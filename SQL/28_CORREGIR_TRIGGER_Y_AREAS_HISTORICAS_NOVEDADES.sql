-- =============================================================================
-- SQL 28: CORRECCIÓN DE TRIGGER Y RESTAURACIÓN DE ÁREAS HISTÓRICAS EN NOVEDADES
-- Sistema AmeriGlobal & Global Link
-- =============================================================================
-- PROBLEMA IDENTIFICADO:
-- 1. El trigger previo 'trg_novedades_sync_empleado' forzaba incondicionalmente
--    'NEW.dependencia := v_emp.dependencia;' tomando siempre el área actual del empleado.
--    Si un colaborador (como Kiara Yanessi Salazar Palacios) estuvo en 'Ventas'
--    durante mayo de 2026 y luego pasó a 'Underwriting', el trigger pisaba
--    cualquier registro de mayo cambiándolo erróneamente a 'Underwriting'.
-- 2. El script 18 ejecutó un UPDATE masivo que sobreescribió las áreas históricas
--    con el área actual de la tabla 'empleados'.
--
-- SOLUCIÓN:
-- 1. Modificar 'fn_sincronizar_novedad_con_empleado' para que:
--    a) NUNCA sobreescriba un área o cargo que ya venga especificado en la novedad.
--    b) Si el área o cargo vienen vacíos, busque primero en 'empleado_periodos'
--       el departamento que le correspondía al colaborador en la 'fecha_inicio' del evento.
--    c) Solo si no existe período histórico registrado, use como fallback el área actual.
-- 2. Restaurar retroactivamente todas las novedades históricas cruzándolas con
--    'empleado_periodos' según su fecha_inicio.
-- =============================================================================

-- 1. Actualizar la función del trigger
CREATE OR REPLACE FUNCTION public.fn_sincronizar_novedad_con_empleado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp RECORD;
  v_per RECORD;
BEGIN
  -- 1. Buscar la ficha oficial del colaborador
  IF NEW.empleado_id IS NOT NULL THEN
    SELECT id, dependencia, cargo, empresa_id, nombre_completo
    INTO v_emp
    FROM public.empleados
    WHERE id = NEW.empleado_id;
  ELSIF NEW.nombre_empleado IS NOT NULL AND TRIM(NEW.nombre_empleado) <> '' THEN
    SELECT id, dependencia, cargo, empresa_id, nombre_completo
    INTO v_emp
    FROM public.empleados
    WHERE UPPER(TRIM(nombre_completo)) = UPPER(TRIM(NEW.nombre_empleado))
    LIMIT 1;
    
    IF FOUND THEN
      NEW.empleado_id := v_emp.id;
    END IF;
  END IF;

  -- 2. Si se identificó el colaborador:
  IF v_emp.id IS NOT NULL THEN
    -- Asignar empresa_id si venía vacío
    IF NEW.empresa_id IS NULL AND v_emp.empresa_id IS NOT NULL THEN
      NEW.empresa_id := v_emp.empresa_id;
    END IF;

    -- Solo auto-asignar dependencia o cargo si el registro NO los tiene ya especificados.
    -- NUNCA pisar un área histórica enviada explícitamente desde la aplicación.
    IF NEW.dependencia IS NULL OR TRIM(NEW.dependencia) = '' OR NEW.cargo IS NULL OR TRIM(NEW.cargo) = '' THEN
      -- Buscar si para la fecha_inicio de la novedad existe un período laboral específico en empleado_periodos
      IF NEW.fecha_inicio IS NOT NULL THEN
        SELECT dependencia, cargo
        INTO v_per
        FROM public.empleado_periodos
        WHERE empleado_id = v_emp.id
          AND fecha_ingreso <= NEW.fecha_inicio
          AND (fecha_retiro IS NULL OR fecha_retiro >= NEW.fecha_inicio)
        ORDER BY numero_periodo DESC
        LIMIT 1;
      END IF;

      -- Auto-asignar dependencia si venía vacía
      IF NEW.dependencia IS NULL OR TRIM(NEW.dependencia) = '' THEN
        IF v_per.dependencia IS NOT NULL AND TRIM(v_per.dependencia) <> '' THEN
          NEW.dependencia := v_per.dependencia;
        ELSIF v_emp.dependencia IS NOT NULL AND TRIM(v_emp.dependencia) <> '' THEN
          NEW.dependencia := v_emp.dependencia;
        END IF;
      END IF;

      -- Auto-asignar cargo si venía vacío
      IF NEW.cargo IS NULL OR TRIM(NEW.cargo) = '' THEN
        IF v_per.cargo IS NOT NULL AND TRIM(v_per.cargo) <> '' THEN
          NEW.cargo := v_per.cargo;
        ELSIF v_emp.cargo IS NOT NULL AND TRIM(v_emp.cargo) <> '' THEN
          NEW.cargo := v_emp.cargo;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Asegurar que el trigger esté asignado a public.novedades
DROP TRIGGER IF EXISTS trg_novedades_sync_empleado ON public.novedades;

CREATE TRIGGER trg_novedades_sync_empleado
BEFORE INSERT OR UPDATE ON public.novedades
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_novedad_con_empleado();

-- 3. Restaurar retroactivamente todas las novedades históricas
-- Si un colaborador cambió de área (como Kiara Yanessi Salazar Palacios de 'Ventas' a 'Underwriting'),
-- restaurar el área y cargo correspondientes a la fecha en que ocurrió la novedad.
UPDATE public.novedades n
SET 
  dependencia = p.dependencia,
  cargo = COALESCE(p.cargo, n.cargo),
  empleado_id = COALESCE(n.empleado_id, p.empleado_id)
FROM public.empleado_periodos p
WHERE (
    n.empleado_id = p.empleado_id 
    OR (n.empleado_id IS NULL AND UPPER(TRIM(n.nombre_empleado)) IN (
        SELECT UPPER(TRIM(nombre_completo)) FROM public.empleados WHERE id = p.empleado_id
    ))
  )
  AND n.fecha_inicio >= p.fecha_ingreso
  AND (p.fecha_retiro IS NULL OR n.fecha_inicio <= p.fecha_retiro)
  AND p.dependencia IS NOT NULL
  AND TRIM(p.dependencia) <> ''
  AND (n.dependencia IS NULL OR n.dependencia <> p.dependencia);

-- 4. Notificar verificación
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.novedades
  WHERE UPPER(TRIM(nombre_empleado)) LIKE '%KIARA%SALAZAR%'
    AND fecha_inicio BETWEEN '2026-05-01' AND '2026-05-31';
  
  RAISE NOTICE 'Novedades de Kiara verificadas en mayo 2026: % registro(s).', v_count;
END $$;
