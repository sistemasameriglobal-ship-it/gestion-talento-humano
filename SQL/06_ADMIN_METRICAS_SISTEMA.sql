-- =============================================================
-- 06_ADMIN_METRICAS_SISTEMA.sql
-- Función que alimenta la pantalla "Sistema" (solo administradores).
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → Run.
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_metricas_sistema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resultado jsonb;
BEGIN
  -- Seguridad real: exige sesión iniciada + cuenta activa + rol admin.
  -- Sin sesión, auth.uid() es NULL y se rechaza.
  IF auth.uid() IS NULL
     OR NOT public.usuario_activo()
     OR NOT public.es_admin() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'db_bytes',       pg_database_size(current_database()),
    'conexiones',     (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()),
    'usuarios_auth',  (SELECT count(*) FROM auth.users),
    'storage_bytes',  COALESCE((SELECT sum((metadata->>'size')::bigint) FROM storage.objects), 0),
    'storage_objetos',(SELECT count(*) FROM storage.objects),
    'tablas', COALESCE((
      SELECT jsonb_agg(t ORDER BY t.bytes DESC)
      FROM (
        SELECT relname AS nombre,
               n_live_tup AS filas,
               pg_total_relation_size(relid) AS bytes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      ) t
    ), '[]'::jsonb)
  ) INTO resultado;

  RETURN resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_metricas_sistema() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_metricas_sistema() TO authenticated;
