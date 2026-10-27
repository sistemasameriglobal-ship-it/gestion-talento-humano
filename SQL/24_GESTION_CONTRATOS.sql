-- ==============================================================================
-- 24_GESTION_CONTRATOS.sql
-- ==============================================================================
-- Crea la tabla de contratos para la gestión y generación de:
-- 1. Contratos de trabajo a término fijo inferior a un año
-- 2. Contratos de aprendizaje (SENA / formación)
-- 3. Contratos de confidencialidad vinculados para ambas partes
-- Permite precarga automática desde la información de Empleados.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contratos (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa                     TEXT NOT NULL DEFAULT 'ameriglobal',
  empleado_id                 UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  tipo_contrato               TEXT NOT NULL DEFAULT 'termino_fijo_menor_anio', -- 'termino_fijo_menor_anio' | 'aprendizaje'
  estado                      TEXT NOT NULL DEFAULT 'vigente', -- 'vigente' | 'por_vencer' | 'finalizado' | 'prorrogado' | 'cancelado'

  -- Datos del Empleador / Empresa Patrocinadora
  razon_social                TEXT NOT NULL DEFAULT 'AMERIGLOBAL S.A.S',
  nit                         TEXT NOT NULL DEFAULT '901272369-7',
  domicilio_empleador         TEXT DEFAULT 'Cra. 43A #1 Sur – 150 Edificio La Strada, piso 4.',
  representante_legal         TEXT NOT NULL DEFAULT 'CARLOS ALBERTO HERRERA',
  cedula_representante        TEXT DEFAULT '79778677 de Bogotá',
  domicilio_representante     TEXT DEFAULT 'Medellín-Antioquia',

  -- Datos del Trabajador / Aprendiz (Prellenados desde Empleados)
  nombre_trabajador           TEXT NOT NULL,
  tipo_documento              TEXT NOT NULL DEFAULT 'CC', -- 'CC' | 'TI' | 'CE' | 'Pasaporte'
  numero_documento            TEXT NOT NULL,
  direccion_trabajador        TEXT,
  fecha_nacimiento            DATE,
  cargo                       TEXT,
  salario_texto               TEXT DEFAULT 'Salario Mínimo más Auxilio De Transporte',
  salario_monto               NUMERIC DEFAULT 0,
  periodo_pago                TEXT DEFAULT 'Quincenal',
  
  -- Fechas y Condiciones del Contrato Principal
  fecha_ingreso               DATE NOT NULL,
  fecha_fin                   DATE,
  duracion_meses              INTEGER DEFAULT 3,
  lugar_labores               TEXT DEFAULT 'Oficina Medellín',
  ciudad_contrato             TEXT DEFAULT 'Medellín',
  horario                     TEXT DEFAULT '9:00 AM - 6:00 PM',
  jornada_laboral             TEXT DEFAULT 'Diurno (42 horas semanales)',
  periodo_prueba_dias         INTEGER DEFAULT 18,
  periodo_prueba_texto        TEXT DEFAULT 'dieciocho (18) días, pudiendo extenderse hasta el máximo permitido por la ley, equivalente a dos (2) meses.',

  -- Campos específicos de Aprendizaje
  institucion_educativa       TEXT,
  programa_formacion          TEXT,
  etapa_aprendizaje           TEXT DEFAULT 'Productiva', -- 'Lectiva' | 'Productiva'
  apoyo_sostenimiento         TEXT DEFAULT '100% SMMLV + EPS + ARL',

  -- Contrato de Confidencialidad Vinculado
  incluye_confidencialidad    BOOLEAN NOT NULL DEFAULT true,
  fecha_confidencialidad      DATE,
  multa_confidencialidad_smmlv INTEGER DEFAULT 500,
  anios_vigencia_post_terminacion INTEGER DEFAULT 10,

  -- Notas y auditoría
  observaciones               TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar búsquedas y filtrados
CREATE INDEX IF NOT EXISTS idx_contratos_empresa         ON public.contratos(empresa);
CREATE INDEX IF NOT EXISTS idx_contratos_empleado_id     ON public.contratos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_contratos_tipo_contrato   ON public.contratos(tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_estado          ON public.contratos(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_fechas          ON public.contratos(fecha_ingreso, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_contratos_documento       ON public.contratos(numero_documento);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION public.update_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contratos_updated_at ON public.contratos;
CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_contratos_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
DROP POLICY IF EXISTS "Permitir lectura de contratos a usuarios autenticados" ON public.contratos;
CREATE POLICY "Permitir lectura de contratos a usuarios autenticados"
  ON public.contratos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir inserción de contratos a usuarios autenticados" ON public.contratos;
CREATE POLICY "Permitir inserción de contratos a usuarios autenticados"
  ON public.contratos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización de contratos a usuarios autenticados" ON public.contratos;
CREATE POLICY "Permitir actualización de contratos a usuarios autenticados"
  ON public.contratos FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir eliminación de contratos a usuarios autenticados" ON public.contratos;
CREATE POLICY "Permitir eliminación de contratos a usuarios autenticados"
  ON public.contratos FOR DELETE
  TO authenticated
  USING (true);
