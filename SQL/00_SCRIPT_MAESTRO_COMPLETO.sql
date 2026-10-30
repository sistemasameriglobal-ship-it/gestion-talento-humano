-- =====================================================================
-- SCRIPT MAESTRO COMPLETO — AmeriGlobal / Global Link (Incapacidades)
-- =====================================================================
-- Generado a partir del esquema REAL en producción (no de versiones
-- anteriores de este archivo, que habían quedado desactualizadas).
--
-- CÓMO USARLO EN UNA CUENTA NUEVA DE SUPABASE:
--   1. Crea el proyecto nuevo en supabase.com
--   2. Ve a SQL Editor → New query
--   3. Pega TODO este archivo y dale Run (una sola vez, de arriba a abajo)
--   4. Copia la "Project URL" y la "anon public key" (Settings → API)
--      a tu archivo .env como VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
--   5. Crea tu primer usuario desde la pantalla de login de la app, y
--      luego marca ese perfil como admin manualmente (ver sección final)
--
-- QUÉ NO INCLUYE A PROPÓSITO:
--   - Datos de empleados/novedades/vacaciones reales (son datos
--     personales del negocio, no de configuración — no deben viajar
--     a una cuenta nueva sin que tú decidas explícitamente migrarlos)
--   - Usuarios de auth.users (se crean solos al hacer login/signup)
--
-- ✅ SEGURIDAD: cada tabla tiene UNA sola política de acceso (o dos,
--   cuando hay un caso admin/no-admin como en 'departamentos' o
--   'empresas'). No queda ninguna política pública/anónima: todo exige
--   sesión iniciada + perfil activo (usuario_activo()), o admin
--   (es_admin()) para lo administrativo. Así quedó también ya aplicado
--   en producción.
-- =====================================================================


-- =====================================================================
-- 1. EXTENSIONES
-- =====================================================================
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;


-- =====================================================================
-- 2. TABLAS
-- =====================================================================

-- ── empresas ──────────────────────────────────────────────────────────
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  razon_social text,
  nit text,
  tagline text,
  logo_letra text,
  icono text default '🏢',
  color_principal text default '#2563EB',
  color_secundario text default '#1D4ED8',
  color_fondo_tag text default '#EFF6FF',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.empresas
  add column if not exists razon_social text,
  add column if not exists nit text,
  add column if not exists tagline text,
  add column if not exists logo_letra text,
  add column if not exists icono text default '🏢',
  add column if not exists color_principal text default '#2563EB',
  add column if not exists color_secundario text default '#1D4ED8',
  add column if not exists color_fondo_tag text default '#EFF6FF',
  add column if not exists activo boolean not null default true;


-- ── departamentos ─────────────────────────────────────────────────────
create table if not exists public.departamentos (
  id uuid primary key default gen_random_uuid(),
  empresa text not null default 'global_link',
  nombre text not null,
  codigo text,
  color text,
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── empleados ─────────────────────────────────────────────────────────
create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  correo text,
  dependencia text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cargo text,
  fecha_ingreso date,
  fecha_retiro date,
  tiene_vehiculo boolean not null default false,
  empresa text default 'ameriglobal',
  dias_vacaciones_tomados_manual numeric default 0,
  liquidado boolean not null default false,
  fecha_liquidacion date,
  observacion_liquidacion text,
  tipo_documento text default 'CC',
  numero_documento text,
  fecha_nacimiento date,
  tipo_sangre text,
  direccion text,
  barrio text,
  municipio text,
  celular text,
  correo_personal text,
  salario numeric default 0,
  auxilio_transporte numeric default 0,
  eps text,
  pension text,
  cesantias text,
  banco text,
  tipo_cuenta text default 'Ahorros',
  numero_cuenta text,
  contactos_emergencia jsonb default '[]'::jsonb,
  fecha_primer_ingreso date,
  fecha_terminacion_anterior date,
  fecha_inicio_empresa_actual date
);
alter table public.empleados
  add column if not exists departamento_id uuid references public.departamentos(id),
  add column if not exists empresa_id uuid references public.empresas(id),
  add column if not exists dias_vacaciones_tomados_manual numeric default 0,
  add column if not exists liquidado boolean not null default false,
  add column if not exists fecha_liquidacion date,
  add column if not exists observacion_liquidacion text,
  add column if not exists tipo_documento text default 'CC',
  add column if not exists numero_documento text,
  add column if not exists fecha_nacimiento date,
  add column if not exists tipo_sangre text,
  add column if not exists direccion text,
  add column if not exists barrio text,
  add column if not exists municipio text,
  add column if not exists celular text,
  add column if not exists correo_personal text,
  add column if not exists salario numeric default 0,
  add column if not exists auxilio_transporte numeric default 0,
  add column if not exists eps text,
  add column if not exists pension text,
  add column if not exists cesantias text,
  add column if not exists banco text,
  add column if not exists tipo_cuenta text default 'Ahorros',
  add column if not exists numero_cuenta text,
  add column if not exists contactos_emergencia jsonb default '[]'::jsonb,
  add column if not exists fecha_primer_ingreso date,
  add column if not exists fecha_terminacion_anterior date,
  add column if not exists fecha_inicio_empresa_actual date;

-- ── empleado_periodos (trazabilidad de contratos, reintegros y traslados) ───
create table if not exists public.empleado_periodos (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  empresa_id uuid references public.empresas(id),
  departamento_id uuid references public.departamentos(id),
  empresa text not null default 'ameriglobal',
  numero_periodo integer not null default 1,
  fecha_ingreso date not null,
  fecha_retiro date,
  motivo_retiro text,
  motivo_transicion text not null default 'reintegro',
  continuidad_laboral boolean not null default false,
  liquidado boolean not null default false,
  fecha_liquidacion date,
  observacion_liquidacion text,
  salario numeric default 0,
  observaciones text,
  cargo text,
  dependencia text,
  es_periodo_actual boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.empleado_periodos
  add column if not exists motivo_retiro text,
  add column if not exists motivo_transicion text not null default 'reintegro',
  add column if not exists continuidad_laboral boolean not null default false,
  add column if not exists liquidado boolean not null default false,
  add column if not exists fecha_liquidacion date,
  add column if not exists observacion_liquidacion text,
  add column if not exists salario numeric default 0;

-- ── perfiles (1:1 con auth.users) ────────────────────────────────────
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text,
  correo text,
  activo boolean not null default false,
  es_admin boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  empresas text[] default array['ameriglobal'],
  permisos jsonb default '{"ameriglobal": ["all"], "global_link": ["all"]}'::jsonb,
  rol text default 'operativo'
);

-- ── novedades (incapacidades, licencias, etc.) ──────────────────────
create table if not exists public.novedades (
  id uuid primary key default gen_random_uuid(),
  nombre_empleado text not null,
  concepto text not null,
  fecha_inicio date,
  fecha_fin date,
  total_dias numeric,
  dependencia text,
  observacion text,
  observacion_contabilidad text,
  validacion_incapacidad text,
  radicacion_incapacidad text,
  prorroga text,
  nomina_electronica text,
  seguridad_social text,
  periodo text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  jornada text,
  diagnostico text,
  empresa text default 'ameriglobal'
);
alter table public.novedades
  add column if not exists cargo text,
  add column if not exists empleado_id uuid references public.empleados(id),
  add column if not exists departamento_id uuid references public.departamentos(id),
  add column if not exists empresa_id uuid references public.empresas(id);

-- ── vacaciones ────────────────────────────────────────────────────────
create table if not exists public.vacaciones (
  id uuid primary key default gen_random_uuid(),
  nombre_empleado text not null,
  dependencia text,
  cargo text,
  tipo_vacacion text not null default 'Vacaciones',
  fecha_inicio date,
  fecha_fin date,
  total_dias numeric,
  estado text not null default 'Pendiente',
  aprobado_por text,
  fecha_solicitud date,
  observacion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  dias_disfrutados numeric,
  dias_en_dinero numeric,
  fecha_ingreso date,
  observacion_contable text,
  periodo_vacaciones text,
  anio text,
  mes_inicio text,
  empresa text default 'ameriglobal'
);
alter table public.vacaciones
  add column if not exists empleado_id uuid references public.empleados(id),
  add column if not exists departamento_id uuid references public.departamentos(id),
  add column if not exists empresa_id uuid references public.empresas(id),
  add column if not exists periodo_id uuid references public.empleado_periodos(id) on delete set null,
  add column if not exists dias_tiempo numeric(5,2),
  add column if not exists dias_dinero numeric(5,2),
  add column if not exists dias_solicitados numeric(5,2);


-- ── procesos_disciplinarios ──────────────────────────────────────────
create table if not exists public.procesos_disciplinarios (
  id uuid primary key default gen_random_uuid(),
  nombre_empleado text not null,
  concepto text not null,
  departamento text,
  fecha date,
  fecha_inicio date,
  fecha_fin date,
  observacion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  hora time,
  archivos jsonb not null default '[]'::jsonb,
  empresa text default 'ameriglobal'
);
alter table public.procesos_disciplinarios
  add column if not exists empleado_id uuid references public.empleados(id),
  add column if not exists departamento_id uuid references public.departamentos(id),
  add column if not exists empresa_id uuid references public.empresas(id);

-- ── productividad ─────────────────────────────────────────────────────
create table if not exists public.productividad (
  id uuid primary key default gen_random_uuid(),
  nombre_empleado text not null,
  departamento text not null,
  periodo text not null,
  metrica text not null,
  valor numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  anio integer not null default extract(year from now())::integer,
  empresa text default 'ameriglobal',
  unique (nombre_empleado, departamento, periodo, metrica, anio)
);
alter table public.productividad
  add column if not exists empleado_id uuid references public.empleados(id),
  add column if not exists departamento_id uuid references public.departamentos(id),
  add column if not exists empresa_id uuid references public.empresas(id);

-- ── productividad_resumen ────────────────────────────────────────────
create table if not exists public.productividad_resumen (
  id uuid primary key default gen_random_uuid(),
  nombre_empleado text not null,
  departamento text not null,
  cargo text,
  ingreso_texto text,
  llamado_atencion integer not null default 0,
  descargos integer not null default 0,
  total_periodo numeric,
  updated_at timestamptz not null default now(),
  empresa text default 'ameriglobal',
  empleado_id uuid references public.empleados(id),
  departamento_id uuid references public.departamentos(id),
  empresa_id uuid references public.empresas(id),
  unique (nombre_empleado, departamento)
);

-- ── cierre_meses ──────────────────────────────────────────────────────
create table if not exists public.cierre_meses (
  id bigint generated always as identity primary key,
  nombre_empleado text not null,
  anio integer not null,
  mes text not null,
  new_offers_units numeric default 0,
  new_offers_dollars numeric default 0,
  renewal_units numeric default 0,
  renewal_dollars numeric default 0,
  total_units numeric default 0,
  total_dollars numeric default 0,
  updated_at timestamptz default now(),
  empresa text default 'ameriglobal',
  empleado_id uuid references public.empleados(id),
  empresa_id uuid references public.empresas(id),
  unique (nombre_empleado, anio, mes)
);

-- ── registros_parqueadero ─────────────────────────────────────────────
create table if not exists public.registros_parqueadero (
  id bigserial primary key,
  nombre_empleado text not null,
  mes text,
  placa text not null,
  cedula text,
  telefono text,
  tipo text check (tipo is null or upper(trim(tipo)) in ('CARRO','MOTO','BICICLETA')),
  fecha_ingreso date,
  fecha_retiro date,
  observacion text,
  created_at timestamptz default now(),
  anio text,
  quincena text,
  fecha_envio_reporte timestamptz,
  retirado boolean default false,
  empresa text default 'ameriglobal',
  empleado_id uuid references public.empleados(id),
  empresa_id uuid references public.empresas(id),
  nota_vehiculo text
);

-- ── audit_logs ────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  correo_usuario text,
  accion text not null,
  tabla text not null,
  registro_id text,
  empresa text not null default 'ameriglobal',
  detalles jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);


-- =====================================================================
-- 3. ÍNDICES
-- =====================================================================
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_empresa on public.audit_logs (empresa);
create index if not exists idx_audit_logs_tabla on public.audit_logs (tabla);
create index if not exists idx_audit_logs_usuario on public.audit_logs (usuario_id);

create index if not exists idx_cierre_meses_empleado_id on public.cierre_meses (empleado_id);
create index if not exists idx_cierre_meses_empresa_id on public.cierre_meses (empresa_id);

create index if not exists idx_departamentos_activo on public.departamentos (activo);
create index if not exists idx_departamentos_empresa on public.departamentos (empresa);

create index if not exists idx_empleados_activo on public.empleados (activo);
create index if not exists idx_empleados_departamento_id on public.empleados (departamento_id);
create index if not exists idx_empleados_dependencia on public.empleados (dependencia);
create index if not exists idx_empleados_empresa on public.empleados (empresa);
create index if not exists idx_empleados_empresa_id on public.empleados (empresa_id);
create index if not exists idx_empleados_nombre on public.empleados (nombre_completo);

create index if not exists idx_empleado_periodos_empleado_id on public.empleado_periodos (empleado_id);
create index if not exists idx_empleado_periodos_empresa on public.empleado_periodos (empresa);
create index if not exists idx_empleado_periodos_fechas on public.empleado_periodos (fecha_ingreso, fecha_retiro);
create index if not exists idx_empleado_periodos_continuidad on public.empleado_periodos (empleado_id, continuidad_laboral);
create unique index if not exists idx_empleado_un_solo_periodo_activo on public.empleado_periodos (empleado_id) where (es_periodo_actual = true);


create index if not exists idx_novedades_departamento_id on public.novedades (departamento_id);
create index if not exists idx_novedades_empleado_id on public.novedades (empleado_id);
create index if not exists idx_novedades_empresa on public.novedades (empresa);
create index if not exists idx_novedades_empresa_id on public.novedades (empresa_id);

create index if not exists idx_perfiles_activo on public.perfiles (activo);
create index if not exists idx_perfiles_correo on public.perfiles (correo);

create index if not exists idx_procesos_disciplinarios_departamento_id on public.procesos_disciplinarios (departamento_id);
create index if not exists idx_procesos_disciplinarios_empleado_id on public.procesos_disciplinarios (empleado_id);
create index if not exists idx_procesos_disciplinarios_empresa on public.procesos_disciplinarios (empresa);
create index if not exists idx_procesos_disciplinarios_empresa_id on public.procesos_disciplinarios (empresa_id);

create index if not exists idx_productividad_departamento_id on public.productividad (departamento_id);
create index if not exists idx_productividad_depto on public.productividad (departamento);
create index if not exists idx_productividad_empleado on public.productividad (nombre_empleado);
create index if not exists idx_productividad_empleado_id on public.productividad (empleado_id);
create index if not exists idx_productividad_empresa_id on public.productividad (empresa_id);
create index if not exists idx_productividad_periodo on public.productividad (periodo);

create index if not exists idx_productividad_resumen_departamento_id on public.productividad_resumen (departamento_id);
create index if not exists idx_productividad_resumen_empleado_id on public.productividad_resumen (empleado_id);
create index if not exists idx_productividad_resumen_empresa_id on public.productividad_resumen (empresa_id);

create index if not exists idx_parqueadero_empresa on public.registros_parqueadero (empresa);
create index if not exists idx_parqueadero_mes on public.registros_parqueadero (mes);
create index if not exists idx_parqueadero_nombre on public.registros_parqueadero (nombre_empleado);
create index if not exists idx_parqueadero_placa on public.registros_parqueadero (placa);
create index if not exists idx_parqueadero_tipo on public.registros_parqueadero (tipo);
create index if not exists idx_registros_parqueadero_empleado_id on public.registros_parqueadero (empleado_id);
create index if not exists idx_registros_parqueadero_empresa_id on public.registros_parqueadero (empresa_id);

create index if not exists idx_vacaciones_departamento_id on public.vacaciones (departamento_id);
create index if not exists idx_vacaciones_dependencia on public.vacaciones (dependencia);
create index if not exists idx_vacaciones_empleado_id on public.vacaciones (empleado_id);
create index if not exists idx_vacaciones_empresa on public.vacaciones (empresa);
create index if not exists idx_vacaciones_empresa_id on public.vacaciones (empresa_id);
create index if not exists idx_vacaciones_estado on public.vacaciones (estado);
create index if not exists idx_vacaciones_fecha_ini on public.vacaciones (fecha_inicio);
create index if not exists idx_vacaciones_nombre on public.vacaciones (nombre_empleado);
create index if not exists idx_vacaciones_periodo_id on public.vacaciones (periodo_id);



-- =====================================================================
-- 4. FUNCIONES
-- =====================================================================

-- Mantiene updated_at al día en cada UPDATE.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- true si el usuario logueado tiene perfiles.activo = true.
create or replace function public.usuario_activo()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  SELECT COALESCE((SELECT activo FROM perfiles WHERE id = auth.uid()), FALSE);
$function$;

-- true si el usuario logueado tiene perfiles.es_admin = true.
create or replace function public.es_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  SELECT COALESCE((SELECT es_admin FROM perfiles WHERE id = auth.uid()), FALSE);
$function$;

-- Auto-confirmar email inmediatamente al insertar en auth.users
create or replace function public.auto_confirmar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $function$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- Crea automáticamente un perfil cuando alguien se registra en auth.users.
-- Si fue creado por admin, nace de inmediato con activo = true.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
DECLARE
  v_creado_por_admin BOOLEAN;
  v_es_admin_creador BOOLEAN;
  v_activo_inicial BOOLEAN;
BEGIN
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
    ARRAY['ameriglobal', 'global_link'],
    '{"ameriglobal": ["all"], "global_link": ["all"]}'::jsonb,
    'operativo'
  )
  ON CONFLICT (id) DO UPDATE SET
    activo = EXCLUDED.activo OR public.perfiles.activo,
    correo = EXCLUDED.correo;

  RETURN NEW;
END;
$function$;

-- Sincronizar automáticamente columnas alias en inserción/actualización de vacaciones
create or replace function public.trg_vacaciones_sync_decimales()
returns trigger
language plpgsql
set search_path = public
as $function$
BEGIN
  IF NEW.dias_tiempo IS NULL AND NEW.dias_disfrutados IS NOT NULL THEN
    NEW.dias_tiempo := NEW.dias_disfrutados;
  ELSIF NEW.dias_disfrutados IS NULL AND NEW.dias_tiempo IS NOT NULL THEN
    NEW.dias_disfrutados := NEW.dias_tiempo;
  END IF;

  IF NEW.dias_dinero IS NULL AND NEW.dias_en_dinero IS NOT NULL THEN
    NEW.dias_dinero := NEW.dias_en_dinero;
  ELSIF NEW.dias_en_dinero IS NULL AND NEW.dias_dinero IS NOT NULL THEN
    NEW.dias_en_dinero := NEW.dias_dinero;
  END IF;

  IF NEW.dias_solicitados IS NULL AND NEW.total_dias IS NOT NULL THEN
    NEW.dias_solicitados := NEW.total_dias;
  ELSIF NEW.total_dias IS NULL AND NEW.dias_solicitados IS NOT NULL THEN
    NEW.total_dias := NEW.dias_solicitados;
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================================
-- 5. TRIGGERS
-- =====================================================================
drop trigger if exists trg_auto_confirmar_usuario on auth.users;
create trigger trg_auto_confirmar_usuario
  before insert on auth.users
  for each row execute function public.auto_confirmar_usuario();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_departamentos_updated_at on public.departamentos;
create trigger trg_departamentos_updated_at before update on public.departamentos
  for each row execute function public.update_updated_at();

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at before update on public.empleados
  for each row execute function public.update_updated_at();

drop trigger if exists trg_empleado_periodos_updated_at on public.empleado_periodos;
create trigger trg_empleado_periodos_updated_at before update on public.empleado_periodos
  for each row execute function public.update_updated_at();

drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at before update on public.perfiles
  for each row execute function public.update_updated_at();

drop trigger if exists trg_vacaciones_updated_at on public.vacaciones;
create trigger trg_vacaciones_updated_at before update on public.vacaciones
  for each row execute function public.update_updated_at();

drop trigger if exists trg_sync_vacaciones_decimales on public.vacaciones;
create trigger trg_sync_vacaciones_decimales
  before insert or update on public.vacaciones
  for each row execute function public.trg_vacaciones_sync_decimales();



-- =====================================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================================
alter table public.empresas enable row level security;
alter table public.departamentos enable row level security;
alter table public.empleados enable row level security;
alter table public.empleado_periodos enable row level security;
alter table public.perfiles enable row level security;
alter table public.novedades enable row level security;
alter table public.vacaciones enable row level security;
alter table public.procesos_disciplinarios enable row level security;
alter table public.productividad enable row level security;
alter table public.productividad_resumen enable row level security;
alter table public.cierre_meses enable row level security;
alter table public.registros_parqueadero enable row level security;
alter table public.audit_logs enable row level security;

-- ── empresas ──────────────────────────────────────────────────────────
drop policy if exists "empresas_select_authenticated" on public.empresas;
create policy "empresas_select_authenticated" on public.empresas
  for select to authenticated using (true);
drop policy if exists "empresas_write_admin" on public.empresas;
create policy "empresas_write_admin" on public.empresas
  for insert to authenticated
  with check (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin = true));
drop policy if exists "empresas_update_admin" on public.empresas;
create policy "empresas_update_admin" on public.empresas
  for update to authenticated
  using (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin = true))
  with check (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin = true));
drop policy if exists "empresas_delete_admin" on public.empresas;
create policy "empresas_delete_admin" on public.empresas
  for delete to authenticated
  using (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.es_admin = true));

-- ── departamentos ─────────────────────────────────────────────────────
drop policy if exists "Usuarios activos pueden ver departamentos" on public.departamentos;
create policy "Usuarios activos pueden ver departamentos" on public.departamentos
  for select using (usuario_activo());
drop policy if exists "Admins pueden gestionar departamentos" on public.departamentos;
create policy "Admins pueden gestionar departamentos" on public.departamentos
  for all using (es_admin()) with check (es_admin());

-- ── empleados ─────────────────────────────────────────────────────────
drop policy if exists "empleados_acceso_usuario_activo" on public.empleados;
create policy "empleados_acceso_usuario_activo" on public.empleados
  for all using (usuario_activo()) with check (usuario_activo());

-- ── empleado_periodos ─────────────────────────────────────────────────
drop policy if exists "empleado_periodos_acceso_usuario_activo" on public.empleado_periodos;
create policy "empleado_periodos_acceso_usuario_activo" on public.empleado_periodos
  for all using (usuario_activo()) with check (usuario_activo());
drop policy if exists "empleado_periodos_delete" on public.empleado_periodos;
create policy "empleado_periodos_delete" on public.empleado_periodos
  for delete using (true);


-- ── perfiles ──────────────────────────────────────────────────────────
drop policy if exists "Ver propio perfil" on public.perfiles;
create policy "Ver propio perfil" on public.perfiles
  for select using (auth.uid() = id);
drop policy if exists "Usuario actualiza su nombre" on public.perfiles;
create policy "Usuario actualiza su nombre" on public.perfiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Admins ven todos" on public.perfiles;
create policy "Admins ven todos" on public.perfiles
  for select using (es_admin());
drop policy if exists "Admins actualizan perfiles" on public.perfiles;
create policy "Admins actualizan perfiles" on public.perfiles
  for update using (es_admin()) with check (es_admin());

-- ── novedades ─────────────────────────────────────────────────────────
drop policy if exists "novedades_acceso_usuario_activo" on public.novedades;
create policy "novedades_acceso_usuario_activo" on public.novedades
  for all using (usuario_activo()) with check (usuario_activo());

-- ── vacaciones ────────────────────────────────────────────────────────
drop policy if exists "vacaciones_acceso_usuario_activo" on public.vacaciones;
create policy "vacaciones_acceso_usuario_activo" on public.vacaciones
  for all using (usuario_activo()) with check (usuario_activo());

-- ── procesos_disciplinarios ──────────────────────────────────────────
drop policy if exists "procesos_disciplinarios_acceso_usuario_activo" on public.procesos_disciplinarios;
create policy "procesos_disciplinarios_acceso_usuario_activo" on public.procesos_disciplinarios
  for all using (usuario_activo()) with check (usuario_activo());

-- ── productividad ─────────────────────────────────────────────────────
drop policy if exists "productividad_acceso_usuario_activo" on public.productividad;
create policy "productividad_acceso_usuario_activo" on public.productividad
  for all using (usuario_activo()) with check (usuario_activo());

-- ── productividad_resumen ────────────────────────────────────────────
drop policy if exists "productividad_resumen_acceso_usuario_activo" on public.productividad_resumen;
create policy "productividad_resumen_acceso_usuario_activo" on public.productividad_resumen
  for all using (usuario_activo()) with check (usuario_activo());

-- ── cierre_meses ──────────────────────────────────────────────────────
drop policy if exists "cierre_meses_acceso_usuario_activo" on public.cierre_meses;
create policy "cierre_meses_acceso_usuario_activo" on public.cierre_meses
  for all using (usuario_activo()) with check (usuario_activo());

-- ── registros_parqueadero ─────────────────────────────────────────────
drop policy if exists "registros_parqueadero_acceso_usuario_activo" on public.registros_parqueadero;
create policy "registros_parqueadero_acceso_usuario_activo" on public.registros_parqueadero
  for all using (usuario_activo()) with check (usuario_activo());

-- ── audit_logs ────────────────────────────────────────────────────────
drop policy if exists "Lectura audit_logs autenticados" on public.audit_logs;
create policy "Lectura audit_logs autenticados" on public.audit_logs
  for select to authenticated using (true);
drop policy if exists "Insercion audit_logs autenticados" on public.audit_logs;
create policy "Insercion audit_logs autenticados" on public.audit_logs
  for insert to authenticated with check (true);


-- =====================================================================
-- 7. STORAGE (adjuntos de procesos disciplinarios)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('procesos-disciplinarios', 'procesos-disciplinarios', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "PD adjuntos: subir autenticado" on storage.objects;
create policy "PD adjuntos: subir autenticado" on storage.objects
  for insert with check (bucket_id = 'procesos-disciplinarios' and auth.role() = 'authenticated');
drop policy if exists "PD adjuntos: leer autenticado" on storage.objects;
create policy "PD adjuntos: leer autenticado" on storage.objects
  for select using (bucket_id = 'procesos-disciplinarios' and auth.role() = 'authenticated');
drop policy if exists "PD adjuntos: borrar autenticado" on storage.objects;
create policy "PD adjuntos: borrar autenticado" on storage.objects
  for delete using (bucket_id = 'procesos-disciplinarios' and auth.role() = 'authenticated');


-- ── 7.1. FUNCIÓN RPC: Sustitución Patronal (Cambio de Razón Social) ─────────
create or replace function public.ejecutar_sustitucion_patronal(
  p_empleado_id uuid,
  p_empresa_destino text,
  p_fecha_sustitucion date,
  p_dependencia text default null,
  p_cargo text default null,
  p_observaciones text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp record;
  v_empresa_id uuid := null;
  v_dep_id uuid := null;
  v_next_num int := 1;
  v_dep_final text;
  v_cargo_final text;
  v_obs_final text;
  v_periodo_mes text;
begin
  select * into v_emp from public.empleados where id = p_empleado_id;
  if not found then
    raise exception 'Empleado con ID % no encontrado.', p_empleado_id;
  end if;

  v_dep_final := coalesce(nullif(trim(p_dependencia), ''), v_emp.dependencia);
  v_cargo_final := coalesce(nullif(trim(p_cargo), ''), v_emp.cargo);
  v_obs_final := coalesce(
    nullif(trim(p_observaciones), ''),
    'Sustitución patronal de ' || coalesce(v_emp.empresa, 'origen') || ' hacia ' || p_empresa_destino || '. Conserva antigüedad laboral, fecha de ingreso original e historial disciplinario/productividad.'
  );
  v_periodo_mes := to_char(p_fecha_sustitucion, 'YYYY-MM');

  begin
    select id into v_empresa_id from public.empresas where slug = p_empresa_destino or codigo = p_empresa_destino limit 1;
  exception when others then
    v_empresa_id := null;
  end;

  begin
    if v_empresa_id is not null and v_dep_final is not null then
      select id into v_dep_id from public.departamentos where empresa_id = v_empresa_id and upper(trim(nombre)) = upper(trim(v_dep_final)) limit 1;
    end if;
  exception when others then
    v_dep_id := null;
  end;

  update public.empleados
  set
    empresa = p_empresa_destino,
    dependencia = v_dep_final,
    cargo = v_cargo_final,
    activo = true,
    empresa_id = coalesce(v_empresa_id, empresa_id),
    departamento_id = coalesce(v_dep_id, departamento_id),
    updated_at = now()
  where id = p_empleado_id;

  begin
    update public.empleado_periodos
    set
      fecha_retiro = p_fecha_sustitucion,
      motivo_retiro = 'Sustitución Patronal',
      observaciones = 'Sustitución patronal hacia ' || p_empresa_destino,
      es_periodo_actual = false
    where empleado_id = p_empleado_id and es_periodo_actual = true;

    select coalesce(max(numero_periodo), 0) + 1 into v_next_num from public.empleado_periodos where empleado_id = p_empleado_id;

    insert into public.empleado_periodos (
      empleado_id, empresa, empresa_id, departamento_id, numero_periodo,
      fecha_ingreso, fecha_retiro, cargo, dependencia, es_periodo_actual,
      continuidad_laboral, motivo_transicion, observaciones
    ) values (
      p_empleado_id, p_empresa_destino, v_empresa_id, v_dep_id, v_next_num,
      p_fecha_sustitucion, null, v_cargo_final, v_dep_final, true,
      true, 'sustitucion_patronal', v_obs_final
    );
  exception when others then
    null;
  end;

  begin
    update public.novedades set empresa = p_empresa_destino, empresa_id = coalesce(v_empresa_id, empresa_id)
    where empleado_id = p_empleado_id or (v_emp.nombre_completo is not null and lower(trim(nombre_empleado)) = lower(trim(v_emp.nombre_completo)));
  exception when others then null; end;

  begin
    insert into public.novedades (concepto, fecha_inicio, fecha_fin, total_dias, periodo, observacion, empleado_id, nombre_empleado, dependencia, empresa, empresa_id, departamento_id)
    values ('Sustitución Patronal', p_fecha_sustitucion, p_fecha_sustitucion, 0, v_periodo_mes, v_obs_final, p_empleado_id, v_emp.nombre_completo, v_dep_final, p_empresa_destino, v_empresa_id, v_dep_id);
  exception when others then null; end;

  begin update public.procesos_disciplinarios set empresa = p_empresa_destino where empleado_id = p_empleado_id or (v_emp.nombre_completo is not null and lower(trim(nombre_empleado)) = lower(trim(v_emp.nombre_completo))); exception when others then null; end;
  begin update public.productividad set empresa = p_empresa_destino where empleado_id = p_empleado_id or (v_emp.nombre_completo is not null and lower(trim(nombre_empleado)) = lower(trim(v_emp.nombre_completo))); exception when others then null; end;
  begin update public.vacaciones set empresa = p_empresa_destino where empleado_id = p_empleado_id or (v_emp.nombre_completo is not null and lower(trim(nombre_empleado)) = lower(trim(v_emp.nombre_completo))); exception when others then null; end;
  begin update public.registros_parqueadero set empresa = p_empresa_destino where empleado_id = p_empleado_id or (v_emp.nombre_completo is not null and lower(trim(nombre_empleado)) = lower(trim(v_emp.nombre_completo))); exception when others then null; end;

  return jsonb_build_object(
    'success', true,
    'empleado_id', p_empleado_id,
    'empresa_origen', v_emp.empresa,
    'empresa_destino', p_empresa_destino,
    'fecha_sustitucion', p_fecha_sustitucion
  );
end;
$$;
grant execute on function public.ejecutar_sustitucion_patronal(uuid, text, date, text, text, text) to authenticated, service_role;


-- =====================================================================
-- 8. DATOS DE CATÁLOGO (empresas + departamentos)
-- =====================================================================
insert into public.empresas (
  codigo, nombre, razon_social, tagline, logo_letra, icono, color_principal, color_secundario, color_fondo_tag, activo
) values
  ('ameriglobal', 'AmeriGlobal', 'AmeriGlobal S.A.S.', 'Gestión Humana & Operaciones', 'A', '🏢', '#2563EB', '#1E40AF', '#EFF6FF', true),
  ('global_link', 'Global Link', 'Global Link S.A.S.', 'Cobranza & Operaciones', 'GL', '🌐', '#0D9488', '#0F766E', '#F0FDFA', true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  razon_social = excluded.razon_social,
  tagline = excluded.tagline,
  logo_letra = excluded.logo_letra,
  icono = excluded.icono,
  color_principal = excluded.color_principal,
  color_secundario = excluded.color_secundario,
  color_fondo_tag = excluded.color_fondo_tag;

insert into public.departamentos (nombre, empresa, activo)
select nombre, empresa, true
from (values
  ('CIERRE'), ('COBRANZA'), ('CONTABILIDAD'), ('GERENCIA'), ('RRHH'),
  ('SERVICIOS GENERALES'), ('SOPORTE TI'), ('UNDERWRITING'), ('VENTAS')
) as dep(nombre)
cross join (values ('ameriglobal'), ('global_link')) as emp(empresa)
where not exists (
  select 1 from public.departamentos d
  where d.empresa = emp.empresa and d.nombre = dep.nombre
);

-- ---------------------------------------------------------------------
-- 8.1 SINCRONIZACIÓN AUTOMÁTICA DE CARGO Y DEPENDENCIA EN NOVEDADES
-- ---------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_novedades_sync_empleado ON public.novedades;

CREATE TRIGGER trg_novedades_sync_empleado
BEFORE INSERT OR UPDATE ON public.novedades
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_novedad_con_empleado();

-- 8.4 CORRECCIÓN DE FECHAS DE NOVEDADES CON CONCEPTO 'Ingreso'
-- Asegura que las novedades de tipo 'Ingreso' tengan la fecha de ingreso real del colaborador
UPDATE public.novedades n
SET
  fecha_inicio = COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso),
  fecha_fin = COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso),
  periodo = TO_CHAR(COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso)::date, 'YYYY-MM'),
  cargo = COALESCE(n.cargo, e.cargo),
  dependencia = COALESCE(n.dependencia, e.dependencia)
FROM public.empleados e
LEFT JOIN LATERAL (
  SELECT ep.fecha_ingreso
  FROM public.empleado_periodos ep
  WHERE ep.empleado_id = e.id AND ep.fecha_ingreso IS NOT NULL
  ORDER BY ep.numero_periodo ASC
  LIMIT 1
) p ON true
WHERE n.concepto = 'Ingreso'
  AND (n.empleado_id = e.id OR LOWER(TRIM(n.nombre_empleado)) = LOWER(TRIM(e.nombre_completo)))
  AND COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso) IS NOT NULL
  AND n.fecha_inicio IS DISTINCT FROM COALESCE(e.fecha_inicio_empresa_actual, e.fecha_ingreso, p.fecha_ingreso, e.fecha_primer_ingreso);

-- 9. DESPUÉS DE CORRER ESTE SCRIPT
-- =====================================================================
-- 1. Registra tu primer usuario desde la pantalla de login de la app
--    (esto crea la fila en auth.users, y el trigger crea su perfil
--    automáticamente en 'perfiles', pero INACTIVO y NO-admin).
-- 2. En el SQL Editor, actívalo y hazlo admin (reemplaza el correo):
--
--    update public.perfiles
--    set activo = true, es_admin = true
--    where correo = 'tu_correo@ejemplo.com';
--
-- 3. Desde la app, con ese usuario admin, ya puedes crear el resto de
--    usuarios, empleados, etc.
-- =====================================================================

