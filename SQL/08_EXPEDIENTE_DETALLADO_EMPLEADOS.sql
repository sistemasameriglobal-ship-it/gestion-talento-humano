-- =====================================================================
-- MIGRACIÓN 08: EXPEDIENTE INTEGRAL DETALLADO DE EMPLEADOS
-- Agrega información personal, ubicación, contacto, salarial,
-- seguridad social, datos bancarios, contactos de emergencia
-- e hitos de ingreso a public.empleados.
-- =====================================================================

ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CC',
  ADD COLUMN IF NOT EXISTS numero_documento TEXT,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS tipo_sangre TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS barrio TEXT,
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS celular TEXT,
  ADD COLUMN IF NOT EXISTS correo_personal TEXT,
  ADD COLUMN IF NOT EXISTS salario NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auxilio_transporte NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eps TEXT,
  ADD COLUMN IF NOT EXISTS pension TEXT,
  ADD COLUMN IF NOT EXISTS cesantias TEXT,
  ADD COLUMN IF NOT EXISTS banco TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT DEFAULT 'Ahorros',
  ADD COLUMN IF NOT EXISTS numero_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS contactos_emergencia JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fecha_primer_ingreso DATE,
  ADD COLUMN IF NOT EXISTS fecha_terminacion_anterior DATE,
  ADD COLUMN IF NOT EXISTS fecha_inicio_empresa_actual DATE;
