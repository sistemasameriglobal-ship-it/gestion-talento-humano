-- =============================================================================
-- SQL 26: REGLA DE VACACIONES (DESDE JUNIO DE 2026) - SÁBADOS ALTERNADOS
-- =============================================================================
-- REGLA DEFINIDA:
-- 1. Antes de junio de 2026 (hasta el 31 de mayo de 2026):
--    - Todos los sábados (que no sean festivos) SÍ cuentan como días hábiles (regla tradicional).
--
-- 2. A partir del 1 de junio de 2026 en adelante:
--    - Los domingos y festivos de Colombia NO son hábiles (nunca cuentan).
--    - Los sábados dentro del período de vacaciones alternan:
--      * 1.er sábado del período: SÍ cuenta como día hábil.
--      * 2.°  sábado del período: NO cuenta como día hábil (no se descuenta del saldo).
--      * 3.er sábado del período: SÍ cuenta como día hábil.
--      * 4.°  sábado del período: NO cuenta como día hábil.
--      * Y así sucesivamente (sábados impares son hábiles, sábados pares no hábiles).
--
-- EJEMPLOS:
-- * Vacación en marzo 2026 de 15 días: ambos sábados (1.º y 2.º) cuentan como hábiles.
-- * Vacación en junio 2026 de 6 días: el 1.er sábado SÍ cuenta como hábil (6 días).
-- * Vacación en junio 2026 de 15 días: el 1.er sábado cuenta, el 2.° sábado NO cuenta.
-- =============================================================================

-- 1. Función para verificar si una fecha es festivo oficial en Colombia (2025 - 2027)
CREATE OR REPLACE FUNCTION public.es_festivo_colombia(p_fecha DATE)
RETURNS BOOLEAN AS $$
DECLARE
  v_festivos DATE[] := ARRAY[
    -- 2025
    '2025-01-01'::DATE, '2025-01-06'::DATE, '2025-03-24'::DATE, '2025-04-17'::DATE,
    '2025-04-18'::DATE, '2025-05-01'::DATE, '2025-06-02'::DATE, '2025-06-23'::DATE,
    '2025-06-30'::DATE, '2025-07-20'::DATE, '2025-08-07'::DATE, '2025-08-18'::DATE,
    '2025-10-13'::DATE, '2025-11-03'::DATE, '2025-11-17'::DATE, '2025-12-08'::DATE,
    '2025-12-25'::DATE,
    -- 2026
    '2026-01-01'::DATE, '2026-01-12'::DATE, '2026-03-23'::DATE, '2026-04-02'::DATE,
    '2026-04-03'::DATE, '2026-05-01'::DATE, '2026-05-18'::DATE, '2026-06-08'::DATE,
    '2026-06-15'::DATE, '2026-07-20'::DATE, '2026-08-07'::DATE, '2026-08-17'::DATE,
    '2026-10-12'::DATE, '2026-11-02'::DATE, '2026-11-16'::DATE, '2026-12-08'::DATE,
    '2026-12-25'::DATE,
    -- 2027
    '2027-01-01'::DATE, '2027-01-11'::DATE, '2027-03-22'::DATE, '2027-03-25'::DATE,
    '2027-03-26'::DATE, '2027-05-01'::DATE, '2027-05-10'::DATE, '2027-05-31'::DATE,
    '2027-06-07'::DATE, '2027-07-20'::DATE, '2027-08-07'::DATE, '2027-08-16'::DATE,
    '2027-10-18'::DATE, '2027-11-01'::DATE, '2027-11-15'::DATE, '2027-12-08'::DATE,
    '2027-12-25'::DATE
  ];
BEGIN
  RETURN p_fecha = ANY(v_festivos);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Función para calcular días hábiles según la ley (sábados alternados desde junio 2026)
CREATE OR REPLACE FUNCTION public.calcular_dias_habiles_vacaciones_2026(
  p_inicio DATE,
  p_fin DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_cur DATE;
  v_dow INT;
  v_count NUMERIC := 0;
  v_sabado_index INT := 0;
BEGIN
  IF p_inicio IS NULL OR p_fin IS NULL OR p_inicio > p_fin THEN
    RETURN 0;
  END IF;

  v_cur := p_inicio;
  WHILE v_cur <= p_fin LOOP
    -- 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    v_dow := EXTRACT(DOW FROM v_cur)::INT;

    -- Si no es domingo y no es festivo
    IF v_dow <> 0 AND NOT public.es_festivo_colombia(v_cur) THEN
      IF v_dow = 6 THEN
        IF v_cur < '2026-06-01'::DATE THEN
          -- Antes de junio de 2026: todos los sábados no festivos cuentan como día hábil
          v_count := v_count + 1;
        ELSE
          -- Desde junio de 2026 en adelante: alternan sábados
          v_sabado_index := v_sabado_index + 1;
          IF (v_sabado_index % 2) = 1 THEN
            v_count := v_count + 1;
          END IF;
        END IF;
      ELSE
        v_count := v_count + 1;
      END IF;
    END IF;

    v_cur := v_cur + INTERVAL '1 day';
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Actualizar registros existentes en public.vacaciones con fechas desde junio 2026
UPDATE public.vacaciones
SET 
  total_dias = public.calcular_dias_habiles_vacaciones_2026(fecha_inicio, fecha_fin),
  dias_disfrutados = CASE 
    WHEN dias_disfrutados IS NOT NULL THEN public.calcular_dias_habiles_vacaciones_2026(fecha_inicio, fecha_fin)
    ELSE dias_disfrutados
  END,
  dias_tiempo = CASE 
    WHEN dias_tiempo IS NOT NULL THEN public.calcular_dias_habiles_vacaciones_2026(fecha_inicio, fecha_fin)
    ELSE dias_tiempo
  END
WHERE (tipo_vacacion IS NULL OR tipo_vacacion <> 'Vacaciones en dinero')
  AND fecha_inicio IS NOT NULL
  AND fecha_fin IS NOT NULL
  AND (fecha_inicio >= '2026-06-01'::DATE OR fecha_fin >= '2026-06-01'::DATE);

-- 4. Actualizar registros existentes en public.novedades con fechas desde junio 2026
UPDATE public.novedades
SET 
  total_dias = public.calcular_dias_habiles_vacaciones_2026(fecha_inicio, fecha_fin),
  dias_disfrutados = CASE 
    WHEN dias_disfrutados IS NOT NULL THEN public.calcular_dias_habiles_vacaciones_2026(fecha_inicio, fecha_fin)
    ELSE dias_disfrutados
  END
WHERE concepto = 'Vacaciones'
  AND (tipo_vacacion IS NULL OR tipo_vacacion <> 'Vacaciones en dinero')
  AND fecha_inicio IS NOT NULL
  AND fecha_fin IS NOT NULL
  AND (fecha_inicio >= '2026-06-01'::DATE OR fecha_fin >= '2026-06-01'::DATE);

-- =============================================================================
-- FIN DEL SCRIPT 26
-- =============================================================================
