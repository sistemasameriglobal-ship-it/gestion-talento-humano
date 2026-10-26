-- ==============================================================================
-- 18_SINCRONIZAR_CARGO_Y_DEPENDENCIA_NOVEDADES.sql
-- ==============================================================================
-- Este script soluciona de forma definitiva la discrepancia donde novedades
-- registradas tenían una dependencia (departamento/área) o cargo desactualizado
-- o erróneo (por ejemplo, empleados de VENTAS asignados a UNDERWRITING).
--
-- Acciones que realiza:
-- 1. Vincula novedades con empleados por empleado_id o por nombre_empleado si empleado_id era NULL.
-- 2. Actualiza 'dependencia' y 'cargo' en 'novedades' según la ficha oficial en 'empleados'.
-- 3. Crea una función y trigger 'trg_novedades_sync_empleado' para asegurar que
--    toda novedad futura (creada o editada) herede automáticamente el departamento
--    y cargo oficial del empleado.
-- ==============================================================================

-- 0. Asegurar que la columna cargo exista en novedades
ALTER TABLE public.novedades ADD COLUMN IF NOT EXISTS cargo text;

-- 1. Sincronizar novedades existentes por empleado_id
UPDATE public.novedades n
SET 
  dependencia = e.dependencia,
  cargo = COALESCE(NULLIF(TRIM(e.cargo), ''), n.cargo),
  empresa_id = COALESCE(e.empresa_id, n.empresa_id),
  updated_at = NOW()
FROM public.empleados e
WHERE n.empleado_id = e.id
  AND (
    n.dependencia IS DISTINCT FROM e.dependencia
    OR (e.cargo IS NOT NULL AND BTRIM(e.cargo) <> '' AND n.cargo IS DISTINCT FROM e.cargo)
  );

-- 2. Sincronizar novedades existentes que no tenían empleado_id pero coinciden en nombre
UPDATE public.novedades n
SET 
  empleado_id = e.id,
  dependencia = e.dependencia,
  cargo = COALESCE(NULLIF(TRIM(e.cargo), ''), n.cargo),
  empresa_id = COALESCE(e.empresa_id, n.empresa_id),
  updated_at = NOW()
FROM public.empleados e
WHERE n.empleado_id IS NULL
  AND UPPER(TRIM(n.nombre_empleado)) = UPPER(TRIM(e.nombre_completo));

-- 3. Crear función trigger para auto-sincronizar siempre departamento y cargo
CREATE OR REPLACE FUNCTION public.fn_sincronizar_novedad_con_empleado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp RECORD;
BEGIN
  -- Si viene con empleado_id, buscar la ficha oficial
  IF NEW.empleado_id IS NOT NULL THEN
    SELECT id, dependencia, cargo, empresa_id, nombre_completo
    INTO v_emp
    FROM public.empleados
    WHERE id = NEW.empleado_id;
  -- Si no viene con empleado_id pero sí con nombre_empleado, buscar por nombre
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

  -- Si se encontró el colaborador oficial, forzar dependencia y cargo
  IF FOUND AND v_emp.id IS NOT NULL THEN
    IF v_emp.dependencia IS NOT NULL AND TRIM(v_emp.dependencia) <> '' THEN
      NEW.dependencia := v_emp.dependencia;
    END IF;

    IF v_emp.cargo IS NOT NULL AND TRIM(v_emp.cargo) <> '' THEN
      NEW.cargo := v_emp.cargo;
    END IF;

    IF NEW.empresa_id IS NULL AND v_emp.empresa_id IS NOT NULL THEN
      NEW.empresa_id := v_emp.empresa_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Asignar el trigger a public.novedades
DROP TRIGGER IF EXISTS trg_novedades_sync_empleado ON public.novedades;

CREATE TRIGGER trg_novedades_sync_empleado
BEFORE INSERT OR UPDATE ON public.novedades
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_novedad_con_empleado();

-- Confirmación
DO $$
BEGIN
  RAISE NOTICE 'Sincronización de novedades con cargos y dependencias oficiales completada exitosamente.';
END $$;
