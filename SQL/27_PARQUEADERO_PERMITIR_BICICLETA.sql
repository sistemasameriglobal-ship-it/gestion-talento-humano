-- ==============================================================================
-- 27_PARQUEADERO_PERMITIR_BICICLETA.sql
-- ==============================================================================
-- SOLUCIÓN AL ERROR:
-- "new row for relation 'registros_parqueadero' violates check constraint 'registros_parqueadero_tipo_check'"
--
-- CAUSA:
-- La tabla `public.registros_parqueadero` tenía una restricción CHECK que solo
-- admitía ('CARRO', 'MOTO'). Al intentar registrar una 'BICICLETA', la base de
-- datos rechazaba la fila.
--
-- SOLUCIÓN:
-- 1. Eliminar la restricción limitante anterior.
-- 2. Crear una nueva restricción que acepte 'CARRO', 'MOTO' y 'BICICLETA'.
-- ==============================================================================

-- 1. Eliminar la restricción anterior en registros_parqueadero
ALTER TABLE public.registros_parqueadero 
  DROP CONSTRAINT IF EXISTS registros_parqueadero_tipo_check;

-- 2. Agregar la nueva restricción permitiendo CARRO, MOTO y BICICLETA
ALTER TABLE public.registros_parqueadero 
  ADD CONSTRAINT registros_parqueadero_tipo_check 
  CHECK (tipo IS NULL OR UPPER(TRIM(tipo)) IN ('CARRO', 'MOTO', 'BICICLETA'));

-- 3. Recargar la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
