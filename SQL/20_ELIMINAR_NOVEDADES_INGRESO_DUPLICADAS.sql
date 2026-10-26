-- =============================================================================
-- SQL 20: ELIMINAR NOVEDADES DUPLICADAS (INGRESO Y MOVIMIENTOS CONTRACTUALES)
-- =============================================================================
-- Contexto:
--   Limpia filas duplicadas en public.novedades que se hayan generado por:
--   1. Doble inserción de la novedad de "Ingreso" al crear colaboradores.
--   2. Registros redundantes de "Cambio de Cargo" cuando ya existe "Cambio de Área" o "Ascenso" en la misma fecha.
--   3. Múltiples novedades de "Ingreso" con la misma fecha para el mismo colaborador.
-- =============================================================================

-- 1. Eliminar novedades de Ingreso duplicadas para el mismo empleado en la misma fecha
WITH duplicados_ingreso AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(empleado_id::text, LOWER(TRIM(nombre_empleado))), fecha_inicio, concepto
           ORDER BY 
             CASE WHEN empleado_id IS NOT NULL THEN 0 ELSE 1 END,
             LENGTH(COALESCE(observacion, '')) DESC,
             created_at ASC,
             id ASC
         ) as rn
  FROM public.novedades
  WHERE concepto = 'Ingreso'
)
DELETE FROM public.novedades
WHERE id IN (
  SELECT id FROM duplicados_ingreso WHERE rn > 1
);

-- 2. Eliminar 'Cambio de Cargo' si en la misma fecha ya existe 'Cambio de Área' o 'Ascenso'
WITH movimientos_redundantes AS (
  SELECT id
  FROM public.novedades n1
  WHERE concepto = 'Cambio de Cargo'
    AND EXISTS (
      SELECT 1 FROM public.novedades n2
      WHERE n2.id <> n1.id
        AND (
          (n1.empleado_id IS NOT NULL AND n2.empleado_id = n1.empleado_id)
          OR LOWER(TRIM(n2.nombre_empleado)) = LOWER(TRIM(n1.nombre_empleado))
        )
        AND n2.fecha_inicio = n1.fecha_inicio
        AND n2.concepto IN ('Cambio de Área', 'Ascenso')
    )
)
DELETE FROM public.novedades
WHERE id IN (SELECT id FROM movimientos_redundantes);

-- 3. Eliminar duplicados exactos de cualquier novedad contractual en la misma fecha
WITH duplicados_contractuales AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(empleado_id::text, LOWER(TRIM(nombre_empleado))), fecha_inicio, concepto
           ORDER BY 
             CASE WHEN empleado_id IS NOT NULL THEN 0 ELSE 1 END,
             LENGTH(COALESCE(observacion, '')) DESC,
             created_at ASC,
             id ASC
         ) as rn
  FROM public.novedades
  WHERE concepto IN ('Ascenso', 'Cambio de Área', 'Cambio de Cargo', 'Ajuste Salarial', 'Paso a Etapa Productiva')
)
DELETE FROM public.novedades
WHERE id IN (
  SELECT id FROM duplicados_contractuales WHERE rn > 1
);
