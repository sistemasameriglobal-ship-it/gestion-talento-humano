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
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  add column if not exists fecha_inicio_empresa_actual date;

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
  add column if not exists empresa_id uuid references public.empresas(id);

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
  tipo text check (tipo in ('CARRO','MOTO')),
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

-- Crea automáticamente un perfil (inactivo, no-admin) cuando alguien
-- se registra en auth.users. Un admin debe activarlo manualmente después.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  INSERT INTO public.perfiles (id, correo, nombre_completo, activo, es_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;


-- =====================================================================
-- 5. TRIGGERS
-- =====================================================================
drop trigger if exists trg_departamentos_updated_at on public.departamentos;
create trigger trg_departamentos_updated_at before update on public.departamentos
  for each row execute function public.update_updated_at();

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at before update on public.empleados
  for each row execute function public.update_updated_at();

drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at before update on public.perfiles
  for each row execute function public.update_updated_at();

drop trigger if exists trg_vacaciones_updated_at on public.vacaciones;
create trigger trg_vacaciones_updated_at before update on public.vacaciones
  for each row execute function public.update_updated_at();

-- Al crear un usuario en Supabase Auth, se le crea su fila en perfiles.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================================
alter table public.empresas enable row level security;
alter table public.departamentos enable row level security;
alter table public.empleados enable row level security;
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


-- =====================================================================
-- 8. DATOS DE CATÁLOGO (empresas + departamentos)
-- =====================================================================
insert into public.empresas (codigo, nombre) values
  ('ameriglobal', 'Ameriglobal'),
  ('global_link', 'Global Link')
on conflict (codigo) do nothing;

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


-- =====================================================================
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
