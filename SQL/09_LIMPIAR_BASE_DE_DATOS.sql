-- =============================================================================
-- SCRIPT DE LIMPIEZA DE BASE DE DATOS
-- Sistema de Talento Humano — AmeriGlobal & Global Link
-- =============================================================================
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- QUÉ HACE ESTE SCRIPT:
--   1. Vacía todas las tablas operativas (empleados, periodos, vacaciones,
--      novedades, procesos disciplinarios, productividad, parqueadero y auditoría).
--   2. Reinicia los contadores de IDs automáticos a 1.
--   3. MANTIENE las empresas base ('ameriglobal', 'global_link') y los departamentos.
--   4. MANTIENE las cuentas de usuarios de administración (auth.users y perfiles).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASO 1: VACIAR TABLAS OPERATIVAS Y REINICIAR CONTADORES
-- -----------------------------------------------------------------------------
TRUNCATE TABLE 
  public.vacaciones,
  public.novedades,
  public.procesos_disciplinarios,
  public.productividad,
  public.productividad_resumen,
  public.cierre_meses,
  public.registros_parqueadero,
  public.empleado_periodos,
  public.empleados,
  public.audit_logs
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- PASO 2: FILTRAR USUARIOS (SECCIÓN ADMIN / USUARIOS)
-- -----------------------------------------------------------------------------
-- Si deseas dejar ÚNICAMENTE a los usuarios con rol de Administrador (es_admin = true)
-- y eliminar los usuarios operativos, de prueba o pendientes:
DELETE FROM auth.users
WHERE id IN (
  SELECT id 
  FROM public.perfiles 
  WHERE es_admin IS NOT TRUE
);

-- Eliminar usuarios huérfanos en auth.users que no tengan fila en perfiles (si los hay)
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id 
  FROM public.perfiles
);

-- Asegurar que los perfiles administradores que quedan estén activos y con permisos completos
UPDATE public.perfiles
SET 
  activo = true,
  es_admin = true,
  rol = 'admin',
  empresas = ARRAY['ameriglobal', 'global_link'],
  permisos = '{"ameriglobal": ["all"], "global_link": ["all"]}'::jsonb
WHERE es_admin = true;

COMMIT;

-- -----------------------------------------------------------------------------
-- PASO 3: CONSULTA DE COMPROBACIÓN
-- Ejecuta esto después para verificar que la base quedó limpia:
-- -----------------------------------------------------------------------------
SELECT 'empleados' AS tabla, count(*) AS total FROM public.empleados
UNION ALL
SELECT 'vacaciones', count(*) FROM public.vacaciones
UNION ALL
SELECT 'novedades', count(*) FROM public.novedades
UNION ALL
SELECT 'procesos_disciplinarios', count(*) FROM public.procesos_disciplinarios
UNION ALL
SELECT 'productividad', count(*) FROM public.productividad
UNION ALL
SELECT 'cierre_meses', count(*) FROM public.cierre_meses
UNION ALL
SELECT 'registros_parqueadero', count(*) FROM public.registros_parqueadero
UNION ALL
SELECT 'perfiles (admins)', count(*) FROM public.perfiles WHERE es_admin = true;
