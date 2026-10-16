-- =============================================================================
-- AMERIGLOBAL SAS & GLOBAL LINK — GESTIÓN DE PERFILES Y AUTOCONFIRMACIÓN
-- Archivo: SQL/12_AUTOCONFIRMAR_Y_EDITAR_PERFILES.sql
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- =============================================================================
-- PROPÓSITO:
--  1. Evitar que las cuentas creadas por administradores queden como
--     "sin confirmar cuentas" (email no confirmado) o en estado pendiente.
--  2. Auto-confirmar el correo inmediatamente al registrar o crear un usuario.
--  3. Permitir que los administradores editen y actualicen completamente
--     los perfiles de los operadores (nombre, correo, rol, contraseña opcional,
--     estado activo/inactivo, empresas y permisos por módulo).
--  4. Regularizar y confirmar todas las cuentas existentes que aún no
--     hayan sido confirmadas en la base de datos.
-- =============================================================================

-- Asegurar disponibilidad de funciones criptográficas para contraseñas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TRIGGER: Auto-confirmar email inmediatamente al insertar en auth.users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_confirmar_usuario()
RETURNS trigger AS $$
BEGIN
  -- Si el usuario no tiene email_confirmed_at, asignarle NOW() automáticamente
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_auto_confirmar_usuario ON auth.users;
CREATE TRIGGER trg_auto_confirmar_usuario
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirmar_usuario();


-- -----------------------------------------------------------------------------
-- 2. TRIGGER MEJORADO: Creación inicial de perfil con soporte de admin
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_creado_por_admin BOOLEAN;
  v_es_admin_creador BOOLEAN;
  v_activo_inicial BOOLEAN;
BEGIN
  -- Determinar si fue creado desde el panel de administración
  v_creado_por_admin := COALESCE((NEW.raw_user_meta_data->>'creado_por_admin')::boolean, FALSE);
  v_es_admin_creador := COALESCE(public.es_admin(), FALSE);
  v_activo_inicial   := (v_creado_por_admin OR v_es_admin_creador);

  INSERT INTO public.perfiles (
    id,
    correo,
    nombre_completo,
    activo,
    es_admin,
    empresas,
    permisos,
    rol
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    v_activo_inicial,
    FALSE,
    ARRAY['ameriglobal', 'global_link']::TEXT[],
    '{"ameriglobal":["all"],"global_link":["all"]}'::jsonb,
    'operativo'
  )
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo,
    nombre_completo = COALESCE(EXCLUDED.nombre_completo, perfiles.nombre_completo),
    activo = CASE WHEN v_activo_inicial THEN TRUE ELSE perfiles.activo END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 3. RPC: Confirmar y activar un usuario directamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_confirmar_usuario(target_user_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo los administradores pueden confirmar usuarios.';
  END IF;

  -- Confirmar en auth.users
  UPDATE auth.users 
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Activar en perfiles
  UPDATE public.perfiles 
  SET 
    activo = TRUE,
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- -----------------------------------------------------------------------------
-- 4. RPC: Edición integral de perfiles de operadores por Administradores
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_actualizar_usuario(
  target_user_id UUID,
  p_nombre_completo TEXT,
  p_correo TEXT,
  p_password TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT 'operativo',
  p_es_admin BOOLEAN DEFAULT FALSE,
  p_activo BOOLEAN DEFAULT TRUE,
  p_empresas TEXT[] DEFAULT ARRAY['ameriglobal']::TEXT[],
  p_permisos JSONB DEFAULT '{"ameriglobal":["all"]}'::jsonb
)
RETURNS void AS $$
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo los administradores pueden modificar perfiles de usuarios.';
  END IF;

  -- 4.1 Actualizar datos en public.perfiles
  UPDATE public.perfiles
  SET 
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    correo = COALESCE(p_correo, correo),
    rol = COALESCE(p_rol, rol),
    es_admin = COALESCE(p_es_admin, es_admin),
    activo = COALESCE(p_activo, activo),
    empresas = COALESCE(p_empresas, empresas),
    permisos = COALESCE(p_permisos, permisos),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- 4.2 Actualizar correo y metadatos en auth.users
  IF p_correo IS NOT NULL AND trim(p_correo) <> '' THEN
    UPDATE auth.users
    SET 
      email = trim(lower(p_correo)),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{nombre_completo}',
        to_jsonb(COALESCE(p_nombre_completo, ''))
      ),
      updated_at = NOW()
    WHERE id = target_user_id;
  END IF;

  -- 4.3 Actualizar contraseña si fue ingresada una nueva (mínimo 6 caracteres)
  IF p_password IS NOT NULL AND length(trim(p_password)) >= 6 THEN
    UPDATE auth.users
    SET 
      encrypted_password = crypt(trim(p_password), gen_salt('bf')),
      updated_at = NOW()
    WHERE id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;


-- -----------------------------------------------------------------------------
-- 5. PERMISOS DE EJECUCIÓN
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_confirmar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT[], JSONB) TO authenticated;


-- -----------------------------------------------------------------------------
-- 6. REGULARIZACIÓN DE CUENTAS EXISTENTES
--    Confirma y activa todas las cuentas que actualmente estén sin confirmar.
-- -----------------------------------------------------------------------------
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

UPDATE public.perfiles 
SET activo = TRUE 
WHERE activo = FALSE;

-- =============================================================================
-- ¡LISTO!
-- Todos los usuarios nuevos y existentes ahora están 100% activos y confirmados.
-- Los administradores ya pueden editar nombres, correos, roles, claves y permisos.
-- =============================================================================
