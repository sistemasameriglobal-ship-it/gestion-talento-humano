// =============================================================
// src/utils/contratosTemplates.js
// -------------------------------------------------------------
// Plantillas oficiales y generador de documentos legales para:
// 1. Contrato de Trabajo a Término Fijo Inferior a Un Año
// 2. Contrato de Aprendizaje (Ley 789 de 2002 / SENA)
// 3. Contrato de Confidencialidad vinculado para ambas partes
// =============================================================

import { LOGO_CONTRATO_BASE64 } from './contratoLogo'
import { obtenerFirmaEmpleador } from './contratoFirma'

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

/**
 * Genera el encabezado oficial institucional de calidad para contratos (Norma interna):
 * Formato cuadrícula de 3 columnas:
 * - Columna Izquierda (20%): Logo oficial Ameriglobal Sas (imagen base64)
 * - Columna Central (56%): Título del documento en mayúsculas y negrita
 * - Columna Derecha (24%): Versión, Edición y Página
 */
export function generarHtmlEncabezadoOficial({
  titulo = 'CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO INFERIOR A UN AÑO',
  version = '01',
  edicion = '07/02/2020',
  pagina = '1 De 6',
  esWord = false,
} = {}) {
  const campoPagina = esWord
    ? `<span style='mso-field-code:" PAGE "'>1</span> De <span style='mso-field-code:" NUMPAGES "'>6</span>`
    : pagina

  // Dimensiones compactas para evitar que ocupe demasiado espacio en Word y PDF
  const logoWidth = esWord ? '65' : '65'
  const logoHeight = esWord ? '50' : '50'
  const fontSizeTitulo = esWord ? '9.5pt' : '10pt'
  const fontSizeMeta = esWord ? '8pt' : '8.5pt'

  return `
    <table class="tabla-encabezado-oficial" border="1" cellpadding="0" cellspacing="0" style="width: 100% !important; border-collapse: collapse !important; border: 1.5pt solid #000000 !important; margin-bottom: 12px !important; font-family: Arial, Helvetica, sans-serif !important; background: #ffffff !important;">
      <tbody>
        <tr style="height: 18px;">
          <td rowspan="3" style="width: 18% !important; border: 1pt solid #000000 !important; padding: 3px 6px !important; text-align: center !important; vertical-align: middle !important; background: #ffffff !important;">
            <img
              src="${LOGO_CONTRATO_BASE64}"
              alt="Ameriglobal Sas"
              width="${logoWidth}"
              height="${logoHeight}"
              style="width: ${logoWidth}px; height: ${logoHeight}px; max-width: ${logoWidth}px; max-height: ${logoHeight}px; object-fit: contain; display: block; margin: 0 auto; border: 0;"
            />
          </td>
          <td rowspan="3" style="width: 58% !important; border: 1pt solid #000000 !important; padding: 4px 8px !important; text-align: center !important; vertical-align: middle !important; font-size: ${fontSizeTitulo} !important; font-weight: 800 !important; text-transform: uppercase !important; color: #000000 !important; line-height: 1.2 !important; letter-spacing: 0.2px !important;">
            ${titulo}
          </td>
          <td style="width: 24% !important; border: 1pt solid #000000 !important; padding: 2px 6px !important; font-size: ${fontSizeMeta} !important; font-weight: 800 !important; color: #000000 !important; vertical-align: middle !important; line-height: 1.15 !important;">
            Versión: <span style="font-weight: 500; margin-left: 2px;">${version}</span>
          </td>
        </tr>
        <tr style="height: 18px;">
          <td style="border: 1pt solid #000000 !important; padding: 2px 6px !important; font-size: ${fontSizeMeta} !important; font-weight: 800 !important; color: #000000 !important; vertical-align: middle !important; line-height: 1.15 !important;">
            Edición: <span style="font-weight: 500; margin-left: 2px;">${edicion}</span>
          </td>
        </tr>
        <tr style="height: 18px;">
          <td style="border: 1pt solid #000000 !important; padding: 2px 6px !important; font-size: ${fontSizeMeta} !important; font-weight: 800 !important; color: #000000 !important; vertical-align: middle !important; line-height: 1.15 !important;">
            Página: <span style="font-weight: 500; margin-left: 2px;" class="campo-pagina-numero">${campoPagina}</span>
          </td>
        </tr>
      </tbody>
    </table>
  `
}

/**
 * Convierte '2026-08-24' en '24 de agosto de 2026'
 */
export function formatearFechaLarga(fechaStr) {
  if (!fechaStr) return '—'
  const partes = String(fechaStr).slice(0, 10).split('-')
  if (partes.length < 3) return fechaStr
  const dia = parseInt(partes[2], 10)
  const mesIndex = parseInt(partes[1], 10) - 1
  const anio = partes[0]
  const mesNombre = MESES_ES[mesIndex] || partes[1]
  return `${dia} de ${mesNombre} de ${anio}`
}

/**
 * Obtiene día, mes y año para firmas
 */
export function getPartesFecha(fechaStr) {
  const d = fechaStr ? new Date(fechaStr + 'T12:00:00') : new Date()
  const dia = d.getDate()
  const mes = MESES_ES[d.getMonth()] || 'octubre'
  const anio = d.getFullYear()
  return { dia, mes, anio }
}

/**
 * Genera la cuadrícula de 2 columnas de firmas compatible 100% con Microsoft Word y Navegadores.
 * Empleador a la izquierda con su firma digital por defecto, y Trabajador/Aprendiz a la derecha.
 */
export function generarBloqueFirmasDosColumnas(c, {
  rolParte1 = 'El Empleador',
  rolParte2 = 'El Trabajador',
  rolCargoParte2 = '',
  rolFirmaParte2 = '',
  esWord = false,
} = {}) {
  const repLegal = c.representante_legal || 'CARLOS ALBERTO HERRERA'
  const razonSocial = c.razon_social || 'AMERIGLOBAL S.A.S'
  const nit = c.nit || '901272369-7'
  const nombreTrabajador = c.nombre_trabajador || '—'
  const tipoDoc = c.tipo_documento || 'CC'
  const numDoc = c.numero_documento || '—'

  const firmaEmpleadorImg = obtenerFirmaEmpleador(c)

  return `
    <table class="tabla-firmas-contrato" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100% !important; border: none !important; border-collapse: collapse !important; margin-top: 40pt; margin-bottom: 20pt; page-break-inside: avoid !important;">
      <tr>
        <td width="50%" valign="top" style="width: 50% !important; vertical-align: top !important; border: none !important; padding: 0 25px 0 0 !important; text-align: left !important;">
          <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 11pt; color: #000000; font-family: Arial, Helvetica, sans-serif;">
            ${rolParte1}
          </p>

          <div style="height: 60px; margin-bottom: 4px;">
            <img
              src="${firmaEmpleadorImg}"
              alt="Firma ${repLegal}"
              width="170"
              height="55"
              style="display: block; width: 170px; height: 55px; object-fit: contain; border: none;"
            />
          </div>

          <div style="border-top: 1.5pt solid #000000; width: 90%; margin-bottom: 6px;"></div>

          <p style="margin: 0; font-weight: 800; font-size: 10pt; text-transform: uppercase; color: #000000; font-family: Arial, Helvetica, sans-serif;">
            ${repLegal}
          </p>
          <p style="margin: 2px 0; font-size: 9pt; color: #333333; font-family: Arial, Helvetica, sans-serif;">
            Representante Legal
          </p>
          <p style="margin: 2px 0; font-weight: 700; font-size: 9pt; color: #000000; font-family: Arial, Helvetica, sans-serif;">
            ${razonSocial}
          </p>
          <p style="margin: 2px 0; font-size: 8.5pt; color: #555555; font-family: Arial, Helvetica, sans-serif;">
            NIT ${nit}
          </p>
        </td>

        <td width="50%" valign="top" style="width: 50% !important; vertical-align: top !important; border: none !important; padding: 0 0 0 25px !important; text-align: left !important;">
          <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 11pt; color: #000000; font-family: Arial, Helvetica, sans-serif;">
            ${rolParte2}
          </p>

          <div style="height: 60px; margin-bottom: 4px;">
            <!-- Espacio reservado para firma manuscrita del colaborador -->
          </div>

          <div style="border-top: 1.5pt solid #000000; width: 90%; margin-bottom: 6px;"></div>

          <p style="margin: 0; font-weight: 800; font-size: 10pt; text-transform: uppercase; color: #000000; font-family: Arial, Helvetica, sans-serif;">
            ${nombreTrabajador}
          </p>
          <p style="margin: 2px 0; font-size: 9pt; color: #333333; font-family: Arial, Helvetica, sans-serif;">
            ${tipoDoc}. ${numDoc}
          </p>
          ${rolCargoParte2 ? `
            <p style="margin: 2px 0; font-size: 8.5pt; color: #555555; font-family: Arial, Helvetica, sans-serif;">
              ${rolCargoParte2}
            </p>
          ` : ''}
          ${rolFirmaParte2 ? `
            <p style="margin: 3px 0 0 0; font-weight: 700; font-size: 8.5pt; color: #1E40AF; font-family: Arial, Helvetica, sans-serif;">
              ${rolFirmaParte2}
            </p>
          ` : ''}
        </td>
      </tr>
    </table>
  `
}

/**
 * Convierte un número de meses en texto ("tres (3) meses")
 */
export function numeroAMesesTexto(meses) {
  const n = parseInt(meses, 10) || 3
  const mapa = {
    1: 'un (1) mes',
    2: 'dos (2) meses',
    3: 'tres (3) meses',
    4: 'cuatro (4) meses',
    5: 'cinco (5) meses',
    6: 'seis (6) meses',
    7: 'siete (7) meses',
    8: 'ocho (8) meses',
    9: 'nueve (9) meses',
    10: 'diez (10) meses',
    11: 'once (11) meses',
    12: 'doce (12) meses',
  }
  return mapa[n] || `${n} meses`
}

/**
 * Calcula la fecha de finalización y el periodo de prueba según fecha de inicio y duración en meses.
 * En Colombia, para contrato a término fijo de 3 meses, el período de prueba es de
 * dos (2) meses (60 días calendario), según el artículo 78 del Código Sustantivo del Trabajo.
 */
export function calcularFinYPrueba(fechaInicioISO, duracionMeses = 3) {
  if (!fechaInicioISO) return { fechaFin: '', diasPrueba: 60 }
  const [anio, mes, dia] = fechaInicioISO.split('-').map(Number)
  
  // Sumar meses
  const fecha = new Date(anio, mes - 1 + duracionMeses, dia)
  // Restar 1 día para el término exacto (ej. 24 de agosto a 23 de noviembre)
  fecha.setDate(fecha.getDate() - 1)
  
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const fechaFin = `${yyyy}-${mm}-${dd}`

  // Dos (2) meses de prueba (60 días calendario máximo según Art 78 CST)
  const diasPrueba = Math.min(60, duracionMeses * 30)

  return { fechaFin, diasPrueba }
}

/**
 * MOTOR DE PRÓRROGAS AUTOMÁTICAS:
 * 1. El contrato es de 3 meses de duración.
 * 2. Los primeros dos (2) meses son de período de prueba.
 * 3. Si pasa la prueba, el contrato se renueva AUTOMÁTICAMENTE cada 3 meses (hasta completar 1 año).
 * 4. Si la empresa decide finalizar al término de cualquier trimestre, lo puede hacer con preaviso de 30 días.
 * 5. Al superar el primer año (después de 4 trimestres = 1 año), el contrato pasa AUTOMÁTICAMENTE
 *    a ser un contrato de un (1) año completo (contrato anual), renovable anualmente.
 */
export function calcularCiclosYProrroga(contrato, fechaReferenciaISO = new Date().toISOString().slice(0, 10)) {
  if (!contrato || !contrato.fecha_ingreso) return null
  const esAprendiz = contrato.tipo_contrato === 'aprendizaje'
  const fechaIngreso = contrato.fecha_ingreso
  const refDate = new Date(fechaReferenciaISO + 'T00:00:00')

  // Si es aprendizaje, es plazo fijo pactado (ej. 6 meses)
  if (esAprendiz) {
    const meses = contrato.duracion_meses || 6
    const { fechaFin } = calcularFinYPrueba(fechaIngreso, meses)
    const finDate = new Date(fechaFin + 'T00:00:00')
    const diffDias = Math.round((finDate - refDate) / 86400000)
    return {
      esAprendiz: true,
      ciclos: [{
        numero: 1,
        nombre: `Etapa de Aprendizaje (${meses} meses)`,
        inicio: fechaIngreso,
        fin: fechaFin,
        esActual: true,
        superado: diffDias < 0,
        esPrueba: false,
        esAnual: false,
      }],
      cicloActual: {
        numero: 1,
        nombre: `Etapa de Aprendizaje (${meses} meses)`,
        inicio: fechaIngreso,
        fin: fechaFin,
        esPrueba: false,
        esAnual: false,
      },
      proximaRenovacion: fechaFin,
      diasParaVencer: diffDias,
      fechaLimitePreaviso: null,
      diasParaPreaviso: null,
      esPeriodoPrueba: false,
      esContratoAnual: false,
      estadoTexto: diffDias < 0 ? 'Concluido' : 'En Formación',
    }
  }

  // Contrato a Término Fijo: 4 trimestres en el año 1, luego pasa a ciclos de 1 año (Contrato Anual)
  const ciclos = []
  let [yInit, mInit, dInit] = fechaIngreso.split('-').map(Number)
  let fechaCursor = new Date(yInit, mInit - 1, dInit)

  // Período de prueba legal: Son los primeros dos (2) meses (60 días) desde la fecha de ingreso
  const dInicioGlobal = new Date(yInit, mInit - 1, dInit)
  const finPruebaCursor = new Date(yInit, mInit - 1 + 2, dInit)
  finPruebaCursor.setDate(finPruebaCursor.getDate() - 1)
  const yPrueba = finPruebaCursor.getFullYear()
  const mPrueba = String(finPruebaCursor.getMonth() + 1).padStart(2, '0')
  const dPrueba = String(finPruebaCursor.getDate()).padStart(2, '0')
  const fechaFinPrueba = `${yPrueba}-${mPrueba}-${dPrueba}`
  const diasParaFinPrueba = Math.round((finPruebaCursor - refDate) / 86400000)
  const esPeriodoPruebaActivo = refDate >= dInicioGlobal && refDate <= finPruebaCursor

  // 4 trimestres del primer año
  for (let i = 1; i <= 4; i++) {
    const yStart = fechaCursor.getFullYear()
    const mStart = String(fechaCursor.getMonth() + 1).padStart(2, '0')
    const dStart = String(fechaCursor.getDate()).padStart(2, '0')
    const inicioStr = `${yStart}-${mStart}-${dStart}`

    // Sumar 3 meses y restar 1 día
    const finCursor = new Date(fechaCursor.getFullYear(), fechaCursor.getMonth() + 3, fechaCursor.getDate())
    finCursor.setDate(finCursor.getDate() - 1)
    const yEnd = finCursor.getFullYear()
    const mEnd = String(finCursor.getMonth() + 1).padStart(2, '0')
    const dEnd = String(finCursor.getDate()).padStart(2, '0')
    const finStr = `${yEnd}-${mEnd}-${dEnd}`

    // Fecha límite de preaviso (30 días calendario antes de finCursor)
    const preavisoCursor = new Date(finCursor)
    preavisoCursor.setDate(preavisoCursor.getDate() - 30)
    const yPre = preavisoCursor.getFullYear()
    const mPre = String(preavisoCursor.getMonth() + 1).padStart(2, '0')
    const dPre = String(preavisoCursor.getDate()).padStart(2, '0')
    const preavisoStr = `${yPre}-${mPre}-${dPre}`

    let nombre = ''
    if (i === 1) nombre = '1er Período (3 meses / 2 meses de prueba)'
    else if (i === 2) nombre = '1ª Prórroga Automática (Trimestre 2)'
    else if (i === 3) nombre = '2ª Prórroga Automática (Trimestre 3)'
    else nombre = '3ª Prórroga Automática (Trimestre 4 - Fin del Año 1)'

    ciclos.push({
      numero: i,
      nombre,
      tipo: i === 1 ? 'periodo_inicial' : 'prorroga_trimestral',
      inicio: inicioStr,
      fin: finStr,
      fechaLimitePreaviso: preavisoStr,
      duracionMeses: 3,
      esPrueba: i === 1 && esPeriodoPruebaActivo,
      fechaFinPrueba: i === 1 ? fechaFinPrueba : null,
      diasParaFinPrueba: i === 1 ? diasParaFinPrueba : null,
      esAnual: false,
    })

    // Siguiente día
    fechaCursor = new Date(finCursor)
    fechaCursor.setDate(fechaCursor.getDate() + 1)
  }

  // A partir de aquí: Pasa automáticamente a CONTRATO ANUAL (Año 2 en adelante)
  let anioContrato = 2
  while (true) {
    const yStart = fechaCursor.getFullYear()
    const mStart = String(fechaCursor.getMonth() + 1).padStart(2, '0')
    const dStart = String(fechaCursor.getDate()).padStart(2, '0')
    const inicioStr = `${yStart}-${mStart}-${dStart}`

    // Sumar 1 año y restar 1 día
    const finCursor = new Date(fechaCursor.getFullYear() + 1, fechaCursor.getMonth(), fechaCursor.getDate())
    finCursor.setDate(finCursor.getDate() - 1)
    const yEnd = finCursor.getFullYear()
    const mEnd = String(finCursor.getMonth() + 1).padStart(2, '0')
    const dEnd = String(finCursor.getDate()).padStart(2, '0')
    const finStr = `${yEnd}-${mEnd}-${dEnd}`

    const preavisoCursor = new Date(finCursor)
    preavisoCursor.setDate(preavisoCursor.getDate() - 30)
    const yPre = preavisoCursor.getFullYear()
    const mPre = String(preavisoCursor.getMonth() + 1).padStart(2, '0')
    const dPre = String(preavisoCursor.getDate()).padStart(2, '0')
    const preavisoStr = `${yPre}-${mPre}-${dPre}`

    ciclos.push({
      numero: ciclos.length + 1,
      nombre: `Contrato Anual (Año ${anioContrato})`,
      tipo: 'contrato_anual',
      inicio: inicioStr,
      fin: finStr,
      fechaLimitePreaviso: preavisoStr,
      duracionMeses: 12,
      esPrueba: false,
      esAnual: true,
    })

    if (finCursor >= refDate) {
      // Agregar el periodo siguiente como proyección visible
      const proximoInicio = new Date(finCursor)
      proximoInicio.setDate(proximoInicio.getDate() + 1)
      const proximoFin = new Date(proximoInicio.getFullYear() + 1, proximoInicio.getMonth(), proximoInicio.getDate())
      proximoFin.setDate(proximoFin.getDate() - 1)
      const proximoPre = new Date(proximoFin)
      proximoPre.setDate(proximoPre.getDate() - 30)

      ciclos.push({
        numero: ciclos.length + 1,
        nombre: `Próximo Contrato Anual (Año ${anioContrato + 1} - Proyección)`,
        tipo: 'contrato_anual',
        inicio: proximoInicio.toISOString().slice(0, 10),
        fin: proximoFin.toISOString().slice(0, 10),
        fechaLimitePreaviso: proximoPre.toISOString().slice(0, 10),
        duracionMeses: 12,
        esPrueba: false,
        esAnual: true,
      })
      break
    }

    anioContrato++
    fechaCursor = new Date(finCursor)
    fechaCursor.setDate(fechaCursor.getDate() + 1)
  }

  // Determinar en qué ciclo se encuentra el colaborador hoy
  let cicloActual = ciclos[0]
  for (const c of ciclos) {
    const dIni = new Date(c.inicio + 'T00:00:00')
    const dFin = new Date(c.fin + 'T23:59:59')
    if (refDate >= dIni && refDate <= dFin) {
      cicloActual = c
      break
    } else if (refDate > dFin) {
      cicloActual = c
    }
  }

  // Marcar status individual
  ciclos.forEach(c => {
    const dFin = new Date(c.fin + 'T23:59:59')
    const dIni = new Date(c.inicio + 'T00:00:00')
    c.esActual = c.numero === cicloActual.numero
    c.superado = refDate > dFin
    c.futuro = refDate < dIni
  })

  // Días para el vencimiento de este ciclo
  const finActualDate = new Date(cicloActual.fin + 'T00:00:00')
  const diasParaVencer = Math.round((finActualDate - refDate) / 86400000)

  // Días restantes para pasar preaviso de 30 días
  const preavisoDate = new Date(cicloActual.fechaLimitePreaviso + 'T00:00:00')
  const diasParaPreaviso = Math.round((preavisoDate - refDate) / 86400000)

  return {
    esAprendiz: false,
    ciclos,
    cicloActual,
    proximaRenovacion: cicloActual.fin,
    diasParaVencer,
    fechaLimitePreaviso: cicloActual.fechaLimitePreaviso,
    diasParaPreaviso,
    esPeriodoPrueba: cicloActual.numero === 1 && esPeriodoPruebaActivo,
    fechaFinPrueba,
    diasParaFinPrueba,
    esContratoAnual: cicloActual.esAnual,
    totalProrrogasTrimestrales: 3,
  }
}

/**
 * Pre-rellena automáticamente los datos del contrato a partir del objeto de Empleado
 */
export function extraerDatosContratoDesdeEmpleado(emp, companyConfig = {}) {
  if (!emp) return {}
  const esAprendiz = (emp.cargo && /aprendiz/i.test(emp.cargo)) || emp.tipo_documento === 'TI'
  const tipoContrato = esAprendiz ? 'aprendizaje' : 'termino_fijo_menor_anio'
  const fechaIngreso = emp.fecha_inicio_empresa_actual || emp.fecha_ingreso || new Date().toISOString().slice(0, 10)
  const duracionMeses = 3
  const { fechaFin, diasPrueba } = calcularFinYPrueba(fechaIngreso, duracionMeses)

  const direccionCompleta = [emp.direccion, emp.barrio, emp.municipio].filter(Boolean).join(', ') || 'Medellín-Antioquia'

  let salarioTexto = 'Salario Mínimo más Auxilio De Transporte'
  if (emp.salario && Number(emp.salario) > 0) {
    salarioTexto = `$ ${Number(emp.salario).toLocaleString('es-CO')}${emp.auxilio_transporte ? ' más Auxilio De Transporte' : ''}`
  }

  return {
    empleado_id: emp.id || null,
    tipo_contrato: tipoContrato,
    estado: 'vigente',
    // Empleador
    razon_social: companyConfig.razon_social || companyConfig.nombre || 'AMERIGLOBAL S.A.S',
    nit: companyConfig.nit || '901272369-7',
    domicilio_empleador: 'Cra. 43A #1 Sur – 150 Edificio La Strada, piso 4.',
    representante_legal: 'CARLOS ALBERTO HERRERA',
    cedula_representante: '79778677 de Bogotá',
    domicilio_representante: 'Medellín-Antioquia',
    // Trabajador / Aprendiz
    nombre_trabajador: emp.nombre_completo || '',
    tipo_documento: emp.tipo_documento || (esAprendiz ? 'TI' : 'CC'),
    numero_documento: emp.numero_documento || '',
    direccion_trabajador: direccionCompleta,
    fecha_nacimiento: emp.fecha_nacimiento || '',
    cargo: emp.cargo || '',
    salario_texto: salarioTexto,
    salario_monto: Number(emp.salario) || 0,
    periodo_pago: 'Quincenal',
    // Condiciones
    fecha_ingreso: fechaIngreso,
    fecha_fin: fechaFin,
    duracion_meses: duracionMeses,
    lugar_labores: 'Oficina Medellín',
    ciudad_contrato: 'Medellín',
    horario: '9:00 AM - 6:00 PM',
    jornada_laboral: 'Diurno',
    periodo_prueba_dias: diasPrueba,
    periodo_prueba_texto: `${diasPrueba} días, pudiendo extenderse hasta el máximo permitido por la ley, equivalente a dos (2) meses`,
    // Aprendizaje
    institucion_educativa: esAprendiz ? 'SENA' : '',
    programa_formacion: esAprendiz ? (emp.cargo || 'Técnico / Tecnólogo') : '',
    etapa_aprendizaje: 'Productiva',
    apoyo_sostenimiento: '100% Salario Mínimo Legal Mensual Vigente + EPS + ARL',
    // Confidencialidad
    incluye_confidencialidad: true,
    fecha_confidencialidad: fechaIngreso,
    multa_confidencialidad_smmlv: 500,
    anios_vigencia_post_terminacion: 10,
    observaciones: '',
  }
}

// =============================================================================
// GENERADORES HTML DE CONTRATOS
// =============================================================================

/**
 * 1. Genera el HTML del Contrato de Trabajo a Término Fijo Inferior a 1 Año
 */
export function generarHtmlContratoLaboral(c, { esWord = false } = {}) {
  const { dia, mes, anio } = getPartesFecha(c.fecha_ingreso)
  const duracionTexto = numeroAMesesTexto(c.duracion_meses || 3)
  const fechaIngresoTexto = formatearFechaLarga(c.fecha_ingreso)
  const fechaFinTexto = formatearFechaLarga(c.fecha_fin)
  const razonSocial = c.razon_social || 'AMERIGLOBAL S.A.S'
  const repLegal = c.representante_legal || 'CARLOS ALBERTO HERRERA'
  const nit = c.nit || '901272369-7'
  const nombreTrabajador = c.nombre_trabajador || '—'
  const tipoDoc = c.tipo_documento || 'CC'
  const numDoc = c.numero_documento || '—'

  const encabezadoOficial = generarHtmlEncabezadoOficial({
    titulo: 'CONTRATO INDIVIDUAL DE TRABAJO A TÉRMINO FIJO INFERIOR A UN AÑO',
    version: '01',
    edicion: '07/02/2020',
    pagina: '1 De 6',
    esWord,
  })

  return `
    <div class="contrato-documento contrato-laboral">
      <table class="documento-impresion-paginado" style="width: 100%; border-collapse: collapse; border: none;">
        <thead>
          <tr>
            <td style="border: none; padding: 0 0 12px 0;">
              ${encabezadoOficial}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: none; padding: 0;">
              <table class="tabla-datos-contrato" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt;">
        <tbody>
          <tr>
            <td style="width: 32%; font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Nombre del Empleador:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 600;">${razonSocial}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Domicilio del Empleador:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${c.domicilio_empleador || 'Cra. 43A #1 Sur – 150 Edificio La Strada, piso 4.'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Nombre del Trabajador:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 700; color: #1E3A8A;">${nombreTrabajador}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Documento de identidad:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${tipoDoc} ${numDoc}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Dirección del Trabajador:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${c.direccion_trabajador || 'Medellín-Antioquia'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Fecha de Nacimiento:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${c.fecha_nacimiento ? formatearFechaLarga(c.fecha_nacimiento) : '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Cargo para desempeñar:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 700;">${c.cargo || '—'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Salario mensual:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 600;">${c.salario_texto || 'Salario Mínimo más Auxilio De Transporte'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Periodos de Pago:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${c.periodo_pago || 'Quincenal'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Fecha de ingreso:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 600;">${fechaIngresoTexto}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Lugar donde desempeñará las labores:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${c.lugar_labores || 'Oficina Medellín'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Ciudad donde se contrató / Horario / Jornada:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">
              <strong>Ciudad:</strong> ${c.ciudad_contrato || 'Medellín'} &nbsp;|&nbsp; 
              <strong>Horario:</strong> ${c.horario || '9:00 AM - 6:00 PM'} &nbsp;|&nbsp; 
              <strong>Jornada:</strong> ${c.jornada_laboral || 'Diurno'}
            </td>
          </tr>
        </tbody>
      </table>

      <p class="parrafo-intro" style="text-align: justify; line-height: 1.6; margin-bottom: 14px;">
        Entre <strong>EL EMPLEADOR</strong> y <strong>EL TRABAJADOR</strong>, se ha celebrado el presente contrato de trabajo, el cual se regirá por las siguientes cláusulas y en lo no previsto en ellas por el Reglamento Interno de Trabajo de LA EMPRESA, del Código Sustantivo del Trabajo y demás normas concordantes:
      </p>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>PRIMERA: OBJETO DEL CONTRATO.</strong> EL TRABAJADOR se obliga a prestar sus servicios personales en forma exclusiva a AL EMPLEADOR, en el desempeño de las funciones propias del cargo suscrito, en las labores anexas y complementarias del mismo, y las demás que EL EMPLEADOR le señale, en las sedes donde sea asignado por ella o en cualquier otra ciudad o dependencia de esta, de acuerdo con las instrucciones y órdenes que le impartan sus superiores.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>SEGUNDA: OBLIGACIONES DEL TRABAJADOR.</strong> EL TRABAJADOR se obliga a desempeñar las funciones del presente contrato, en caso de no cumplirlas se le hará el llamado de atención y en su defecto, podrá dar terminación unilateral del contrato, EL TRABAJADOR se obliga a:</p>
        <ol style="padding-left: 20px; margin: 8px 0;">
          <li>Desarrollar su labor con excelente disposición, diligencia y entrega, poniendo al servicio del EMPLEADOR toda su capacidad de trabajo en el desempeño de las funciones propias de la labor contratada, atendiendo las instrucciones que le imparta EL EMPLEADOR o los superiores jerárquicos.</li>
          <li>Manejar escrupulosamente los valores, bienes y documentos que se le encomienden, transitoria o permanentemente, por razón de su cargo y rendir cuenta rigurosa de ellos AL EMPLEADOR, en las condiciones y tiempo que se le indique.</li>
          <li>Cumplir con el contrato de manera juiciosa y diligente en el lugar, tiempo y condiciones que EL EMPLEADOR le señale.</li>
          <li>Leer y cumplir rigurosamente la disciplina interna establecida por EL EMPLEADOR o por las personas autorizadas por este.</li>
          <li>Guardar estrictamente la reserva de la información que llegue a su conocimiento por razones de su oficio, haciéndose responsable hasta de la culpa leve por los perjuicios que llegare a generar AL EMPLEADOR por la violación de esta reserva.</li>
          <li>Velar por la buena marcha de la empresa, el mejoramiento y tecnificación de sus métodos de trabajo, teniendo en cuenta que es un colaborador de la empresa para el beneficio mutuo de los contratantes y el progreso colectivo.</li>
          <li>No atender durante las horas de trabajo, asuntos u ocupaciones diferentes (como uso de correo y redes personales en la oficina, ni celular personal) a los que EL EMPLEADOR, o las personas autorizadas por este le encomienden.</li>
          <li>Conservar y restituir en buen estado, salvo el natural deterioro causado por el servicio, los computadores, herramientas, utensilios y demás bienes del establecimiento donde presta sus servicios.</li>
          <li>Acatar el reglamento interno de trabajo.</li>
          <li>Atender comedidamente las reclamaciones del público e informar a sus superiores inmediatos sobre las irregularidades que se presenten.</li>
          <li>Indemnizar AL EMPLEADOR por la pérdida o daño de los objetos y valores que se le hayan confiado permanente o transitoriamente, cuando estos sean ocasionados intencionalmente o por falta del debido cuidado, salvo por fuerza mayor, caso fortuito o por el desgaste o deterioro propio de la naturaleza o uso normal del bien.</li>
          <li>Aceptar los traslados del lugar de trabajo que determine EL EMPLEADOR.</li>
          <li>A no prestarle directa o indirectamente servicios laborales a otros empleadores, ni trabajar por cuenta propia en actividades que afecten su capacidad, rendimiento, productividad o que en cualquier otra forma afecten el servicio contratado.</li>
          <li>A hacer uso de su horario de trabajo en forma puntual y exclusivamente para el cumplimiento de las labores contratadas con EL EMPLEADOR.</li>
          <li>EL TRABAJADOR se compromete a participar en la capacitación y el entrenamiento de los nuevos empleados o de quienes ocupen nuevos puestos.</li>
          <li>Las demás obligaciones que le corresponden de acuerdo con la ley.</li>
          <li>A RESPETAR (quiere decir a no alzar la voz con malos tratos, ni hablar mal de la compañía, además no generar mal ambiente laboral con chismes, ni malos comentarios con sus compañeros de trabajo) a sus superiores y compañeros de trabajo.</li>
          <li>A llegar cumplidamente a su jornada laboral y registrarse en el sistema de verificación de entrada a la hora señalada, para el ingreso a la empresa; y cerrar debidamente el sistema TIME CLOCK.</li>
          <li>A no estar en los puestos de trabajo de sus compañeros charlando o haciendo algo diferente a su trabajo.</li>
          <li>A cumplir con las órdenes que su superior o jefe le indiquen.</li>
          <li>A no tener ningún vínculo afectivo (noviazgo) con un superior o compañero de trabajo.</li>
          <li>A llevar adecuadamente la ropa de trabajo, de lunes a jueves tener una vestimenta formal (no usar jean rotos, shorts, gorras, ropa excesivamente corta o cualquier otra vestimenta que no cumpla con los estándares de presentación definidos por la empresa); los días viernes se puede usar jean, pero no jean roto.</li>
          <li>Responder por los daños y perjuicios ocasionados directamente a LA EMPRESA, cuando sean consecuencia de una actuación intencional o de la falta del debido cuidado por parte del trabajador.</li>
          <li>A no fumar, consumir licor o cualquier alucinógeno dentro de la empresa, o en su defecto llegar embriagado a su puesto de trabajo, o comenzar su jornada laboral bajo los efectos de algún tipo de alucinógeno como Marihuana, Éxtasis, Ketamina, Cocaína, etc.</li>
          <li>A no tener en el celular personal, información de clientes de las empresas a los cuales ${razonSocial} les presta el servicio.</li>
          <li>A cumplir con los requisitos que nuestro cliente PRADA LAW - PRIMO CASH - FORTUN tienen, para así poder prestarle un excelente servicio.</li>
        </ol>

        <p style="margin-top: 10px;"><strong>PARÁGRAFO:</strong> En caso de que se diligencie los documentos sin el lleno de estos requisitos, o que la información sea falsa, o firmar un documento por otra persona se considera un fraude, por lo tanto, esto es una acción que resulta contraria a la verdad y a la rectitud. El fraude se comete en perjuicio contra otra persona u organización y está penado por la ley. Este concepto se asocia al de estafa, que es un delito contra el patrimonio o la propiedad. El delito de estafa está regulado por el Código Penal en su artículo 246, el cual manifiesta: <em>“El que obtenga provecho ilícito para sí o para un tercero, con perjuicio ajeno, induciendo o manteniendo a otro en error por medio de artificios o engaños, incurrirá en prisión de 2 a 8 años y multa de 50 a mil 1000 salarios mínimos legales mensuales vigentes”</em>. La persona que cometa este delito y al firmar este contrato se entiende y asume que este es el castigo por robo y fraude a la empresa y además obviamente es causal de despido inmediato con justa causa y en su liquidación se le descontarán los gastos que ocasionó a la empresa para solucionar los daños que ocasionó.</p>

        <p style="margin-top: 10px;"><strong>PARÁGRAFO:</strong> De igual manera quedan PROHIBIDAS las siguientes conductas: Llamadas personales en horarios laborales; El uso del correo y redes sociales personales en la oficina; El uso del celular personal dentro de la oficina; El uso de la página o chat EMPRESARIAL para conversaciones personales; El envío de mensajes de texto personales en el celular de la EMPRESA; Utilizar las claves de cuentas con fines diferentes al normal desarrollo de las actividades empresariales cotidianas; Apropiarse de la base de datos de los clientes y contactos de la empresa para beneficio propio o de terceros; Hacer negocios o celebrar contratos con clientes de la empresa; El uso no autorizado de propiedad intelectual de Visas y Trámites Internacionales.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>TERCERA: DURACIÓN Y PRÓRROGAS AUTOMÁTICAS.</strong> El presente contrato tiene una duración inicial de tres (3) meses, desde el ${fechaIngresoTexto} HASTA el ${fechaFinTexto}. Las partes acuerdan expresamente que el contrato no requiere celebrarse nuevamente al vencimiento de cada período; por tanto, si ninguna de las partes manifiesta por escrito a la otra con una antelación mínima de treinta (30) días calendario a la fecha prevista para su terminación su intención de no renovarlo, <strong>el presente contrato se prorrogará automáticamente por períodos sucesivos e iguales de tres (3) meses</strong>, hasta por tres (3) prórrogas consecutivas (completando así el primer año de servicios). <strong>Cumplido el primer año continuo de servicios</strong>, y de estricta conformidad con lo ordenado por el artículo 46 del Código Sustantivo del Trabajo (modificado por el artículo 3 de la Ley 50 de 1990), el presente contrato <strong>pasará automáticamente a prorrogarse por períodos de un (1) año en forma sucesiva (contrato anual)</strong>, y así de manera indefinida mientras subsistan las causas que le dieron origen. Si LA EMPRESA decide dar por terminado el contrato al vencimiento de cualquiera de sus períodos trimestrales o anuales, podrá hacerlo mediante comunicación escrita de no renovación remitida con la antelación de ley.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>CUARTA:</strong> El TRABAJADOR acepta y conoce lo que está estipulado en el Reglamento Interno de Trabajo.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>QUINTA: PERÍODO DE PRUEBA.</strong> Los primeros dos (2) meses de ejecución del presente contrato (equivalentes a sesenta (60) días calendario) operarán como período de evaluación y prueba de conformidad con lo prescrito por el artículo 78 del Código Sustantivo del Trabajo, durante el cual EL EMPLEADOR evaluará las aptitudes profesionales, técnicas, disciplinarias y de adaptación del trabajador, y este a su vez las condiciones del cargo encomendado. Si el trabajador no supera satisfactoriamente dicho período inicial de prueba de dos (2) meses, cualquiera de las partes podrá dar por terminado el contrato de trabajo de manera unilateral e inmediata en cualquier momento dentro de dicho lapso de dos meses, sin que ello genere obligación de preaviso ni pago de indemnización alguna. Una vez superado dicho período de prueba de dos meses, el contrato continuará en vigor hasta el vencimiento del término pactado de tres (3) meses y sus sucesivas renovaciones automáticas trimestrales y anuales conforme a la Cláusula Tercera, salvo manifestación escrita de no renovación remitida con la antelación legal mínima de treinta (30) días calendario.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>SEXTA: TERMINACIÓN UNILATERAL.</strong> Son justas causas para dar por terminado unilateralmente este contrato:</p>
        <ul style="padding-left: 20px; margin: 8px 0;">
          <li>Por tener 3 llamados de atención por cualquier acto cometido en contra del Reglamento Interno de Trabajo o tener 3 llamados de atención por incumplir la Cláusula Segunda OBLIGACIONES DEL TRABAJADOR. Tener tres llamados de atención por productividad será un justo motivo para dar por terminado el contrato laboral.</li>
          <li>Cuando se cometa fraude y/o estafa o se produzca la divulgación de información confidencial de la empresa o clientes.</li>
          <li>Todo acto de violencia, injuria, malos tratamientos o grave indisciplina en que incurra el trabajador en sus labores, contra el patrono, los miembros de su familia, el personal directivo o los compañeros de trabajo.</li>
          <li>Todo acto grave de violencia, injuria o malos tratamientos en que incurra el trabajador fuera del servicio, en contra del patrono, de los miembros de su familia o de sus representantes, y socios, jefes, vigilantes o celadores.</li>
          <li>El que el trabajador revele los secretos técnicos o comerciales o dé a conocer asuntos de carácter reservado, con perjuicio de la empresa.</li>
          <li>El deficiente rendimiento en el trabajo en relación con la capacidad del trabajador y con el rendimiento promedio en labores similares, cuando no se corrija en un plazo razonable a pesar del requerimiento del patrono.</li>
          <li>Todo vicio del trabajador que perturbe la disciplina del establecimiento.</li>
          <li>La renuncia sistemática del trabajador a aceptar las medidas preventivas, profilácticas o curativas, prescritas por el médico del patrono o por las autoridades para evitar enfermedades o accidentes.</li>
          <li>La ineptitud del trabajador para realizar la labor encomendada.</li>
          <li>Además, cualquier acto del empleado hacia la empresa o sus superiores tales como: Mala fe, fraude, mala actitud en su trabajo y ante sus jefes, uso de malas palabras, groserías o mal vocabulario, mal comportamiento, llegadas tarde sin justificación y que por eso tenga 2 llamados de atención o incumplimiento en el horario y en la disciplina de cómo llevar la ropa de trabajo.</li>
          <li>Que la información sea falsa, o firmar documentos por otra persona. Si hay venta de información privada de la empresa a un tercero, manipulación de información en celulares o emails personales, este acto será denunciado ante la FISCALÍA y es causal de despido inmediato con justa causa.</li>
          <li>Las enumeradas en el artículo 7° del Decreto 2351/65; y además por parte del empleador, las faltas que para el efecto se califiquen como graves en el reglamento interno de trabajo.</li>
        </ul>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>SÉPTIMA:</strong> El TRABAJADOR que renuncie a la empresa, debe pasar preaviso de 30 días. Esto con el fin de dar un tiempo prudente a la misma para que busque al suplente, el trabajador acepta que una renuncia sin previo aviso va a causar daño y perjuicio a la Empresa.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>OCTAVA: REMUNERACIÓN.</strong> Por la prestación de sus servicios EL EMPLEADOR se obliga a pagar AL TRABAJADOR una remuneración mensual de acuerdo con lo pactado en el encabezado de este documento y/o en sus anexos, serán pagaderos por transferencia bancaria, en dos quincenas, los días 15 y 30 de cada mes. Dentro de esta remuneración mensual queda comprendido el pago de los días de descansos obligatorios, el cual son los días dominicales y festivos de que tratan los capítulos I y II del título VII del Código Sustantivo del Trabajo.</p>
        <p style="margin-top: 8px;"><strong>PARÁGRAFO PRIMERO:</strong> Las partes expresamente acuerdan que en concordancia con el artículo 15 de la ley 50 de 1990 y el art. 128 del C.S.T. (“Pagos que no constituyen salario”), no constituyen salario ni en dinero ni en especie, las sumas que ocasional o habitualmente llegue a recibir EL EMPLEADO DEL EMPLEADOR por mera liberalidad, tales como: la alimentación, habitación, dotaciones, primas extralegales, bonificaciones, participación de utilidades, aguinaldos de navidad, primas de antigüedad, participación en méritos o calificación de servicios y cumplimiento de metas, auxilios, auxilio por calamidad doméstica, beneficios o ventajas que se le presten al EMPLEADO y que se encuentren contempladas en el Código Sustantivo de Trabajo.</p>
        <p style="margin-top: 8px;"><strong>PARÁGRAFO SEGUNDO: AUTORIZACIÓN PARA DEDUCCIONES:</strong> EL TRABAJADOR autoriza a EL EMPLEADOR para efectuar, dentro de los límites permitidos por la ley, las deducciones que correspondan sobre su salario, prestaciones sociales o liquidación final, respecto de las sumas que se encuentren debidamente causadas y adeudadas a EL EMPLEADOR por cualquier concepto. En caso de terminación del contrato por cualquier causa, EL TRABAJADOR autoriza igualmente que las sumas que se encuentren debidamente causadas y adeudadas sean descontadas de los valores a su favor, en los términos permitidos por la ley.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>NOVENA: JORNADA DE TRABAJO DIURNO.</strong> EL TRABAJADOR se obliga a laborar la jornada ordinaria de 42 horas en los turnos y dentro de las horas señaladas por EL EMPLEADOR, pudiendo hacer éste ajustes o cambios de horario cuando lo estime conveniente. Por el acuerdo expreso o tácito de las partes, podrán repartirse las horas de la jornada ordinaria en la forma prevista en el artículo 164 del Código Sustantivo del Trabajo, modificado por el artículo 23 de la ley 50 de 1990, teniendo en cuenta que los tiempos de descanso entre las secciones de la jornada no se computan dentro de la misma, según el artículo 167 ibídem.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA: TRABAJO NOCTURNO, SUPLEMENTARIO, DOMINICAL Y/O FESTIVO.</strong> Para el reconocimiento y pago del trabajo suplementario, nocturno, dominical o festivo, EL EMPLEADOR o sus representantes deberán haberlo autorizado previamente y por escrito. Cuando la necesidad de este trabajo se presente de manera imprevista o inaplazable, deberá ejecutarse y darse cuenta de él por escrito, a la mayor brevedad, AL EMPLEADOR o a sus representantes para su aprobación.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA PRIMERA: CLÁUSULA DE EXCLUSIVIDAD.</strong> EL TRABAJADOR se obliga a NO prestar sus servicios para otra empresa que desarrolle labores iguales o similares a las que realiza para EL EMPLEADOR o cualquier área del Derecho, durante la vigencia del contrato y por un periodo de 90 días después de finalizado su contrato en labores similares. Todos los clientes para los cuales usted trabaje durante la vigencia de nuestro contrato son única y exclusivamente clientes de la compañía a los cuales le prestamos servicios y solo se hará a través de la compañía y no en uso personal.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA SEGUNDA: CONFIDENCIALIDAD.</strong> EL TRABAJADOR se obliga a guardar absoluta reserva sobre toda la información que adquiera o conozca en razón de su trabajo para EL EMPLEADOR y se obliga a no utilizar esta fuera de la empresa, a no comunicarlo a terceros, en especial los secretos profesionales, industriales, comerciales y tecnológicos de la empresa como software de operaciones, desarrollos de sistemas, análisis, estudios, bases de datos, diseños, dibujo, sistemas de cálculos, entre otros, o de aquella información de naturaleza reservada, durante la vigencia del contrato y dentro de los 10 (diez) años posteriores a su terminación. La violación de esta obligación constituye una falta grave que da lugar al despido y a las acciones legales consagradas en el artículo 16 de la Ley 256 de 1996 y el artículo 308 del Código Penal.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA TERCERA: SERVICIO A TERCEROS.</strong> EL TRABAJADOR se obliga a prestar sus servicios AL EMPLEADOR a personas naturales y jurídicas en Colombia y en el extranjero que este determine.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA CUARTA: INVENCIONES.</strong> Las invenciones realizadas por EL TRABAJADOR le pertenecen a la empresa siempre y cuando estas sean realizadas con ocasión y dentro de la ejecución del contrato de trabajo.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA QUINTA: DERECHOS DE AUTOR.</strong> Los derechos patrimoniales de autor sobre las obras creadas por EL TRABAJADOR en ejercicio de sus funciones pertenecen AL EMPLEADOR, de conformidad con la Ley 23 de 1982 y la Decisión 351 de la Comisión del Acuerdo de Cartagena.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA SEXTA: TRASLADOS.</strong> Desde ya EL TRABAJADOR acuerda que EL EMPLEADOR podrá trasladarlo desde el lugar, cargo y/o sitio de trabajo de acuerdo con las necesidades del servicio, asumiendo la empresa los gastos de traslado cuando sea decisión unilateral.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA SÉPTIMA: MODIFICACIÓN DE LAS CONDICIONES LABORALES.</strong> El TRABAJADOR acepta desde ahora expresamente todas las modificaciones determinadas por EL EMPLEADOR, en ejercicio de su poder subordinante, de sus condiciones laborales, tales como la jornada de trabajo, el lugar de prestación de servicio, el cargo u oficio y/o funciones y la forma de remuneración, siempre de conformidad con la ley.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>DÉCIMA OCTAVA: EFECTOS.</strong> El presente contrato reemplaza en su integridad y deja sin efecto cualquiera otro contrato, verbal o escrito, celebrado entre las partes con anterioridad.</p>
      </div>

      <p style="margin-top: 24px; text-align: justify; line-height: 1.6;">
        Para constancia se firma en dos ejemplares del mismo tenor tanto para EL EMPLEADOR como para EL EMPLEADO en la ciudad de ${c.ciudad_contrato || 'Medellín'} a los ${dia} días del mes de ${mes} de ${anio}.
      </p>

      ${generarBloqueFirmasDosColumnas(c, {
        rolParte1: 'El Empleador',
        rolParte2: 'El Trabajador',
        rolCargoParte2: c.cargo || 'Trabajador',
        rolFirmaParte2: 'TRABAJADOR',
        esWord,
      })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

/**
 * 2. Genera el HTML del Contrato de Confidencialidad
 * (Adapta automáticamente si es Trabajador/Receptor o Aprendiz)
 */
export function generarHtmlConfidencialidad(c, { esWord = false } = {}) {
  const esAprendiz = c.tipo_contrato === 'aprendizaje'
  const fechaUso = c.fecha_confidencialidad || c.fecha_ingreso
  const { dia, mes, anio } = getPartesFecha(fechaUso)
  const fechaEncabezado = `${c.ciudad_contrato || 'Medellín'}, ${dia} de ${mes} de ${anio}.`
  const razonSocial = c.razon_social || 'AMERIGLOBAL S.A.S'
  const repLegal = c.representante_legal || 'CARLOS ALBERTO HERRERA'
  const ccRepLegal = c.cedula_representante || '79778677 de Bogotá'
  const domRepLegal = c.domicilio_representante || 'Medellín-Antioquia'
  const nit = c.nit || '901272369-7'
  const nombreParte2 = c.nombre_trabajador || '—'
  const tipoDocParte2 = c.tipo_documento || (esAprendiz ? 'Tarjeta de identidad' : 'cédula')
  const numDocParte2 = c.numero_documento || '—'
  const domParte2 = c.direccion_trabajador || 'Medellín-Antioquia'
  const rolParte2 = esAprendiz ? 'EL APRENDIZ' : 'TRABAJADOR(A)-RECEPTOR(A) DE INFORMACION'
  const rolFirma = esAprendiz ? 'EL APRENDIZ' : 'TRABAJADOR(A)-RECEPTOR(A) DE INFORMACION'
  const multaSMMLV = c.multa_confidencialidad_smmlv || 500
  const aniosVigencia = c.anios_vigencia_post_terminacion || 10

  const tituloConfidencialidad = esAprendiz ? 'CONTRATO DE CONFIDENCIALIDAD APRENDIZ' : 'CONTRATO DE CONFIDENCIALIDAD'
  const encabezadoOficial = generarHtmlEncabezadoOficial({
    titulo: tituloConfidencialidad,
    version: '01',
    edicion: '07/02/2020',
    pagina: '1 De 4',
    esWord,
  })

  return `
    <div class="contrato-documento contrato-confidencialidad" style="page-break-before: always; margin-top: 30px; padding-top: 10px;">
      <table class="documento-impresion-paginado" style="width: 100%; border-collapse: collapse; border: none;">
        <thead>
          <tr>
            <td style="border: none; padding: 0 0 12px 0;">
              ${encabezadoOficial}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: none; padding: 0;">
              <div class="doc-header-fecha" style="font-size: 10.5pt; font-weight: 700; margin-bottom: 16px; color: #334155;">
                ${fechaEncabezado}
              </div>

              <p class="parrafo-comparecencia" style="text-align: justify; line-height: 1.65; margin-bottom: 16px;">
                Reunidos de una parte, <strong>${razonSocial}</strong>, sociedad identificada con NIT <strong>${nit}</strong> con domicilio en ${c.ciudad_contrato || 'Medellín'} representada legalmente por el señor <strong>${repLegal}</strong> identificado con cédula N° ${ccRepLegal} con domicilio en ${domRepLegal} quien en adelante se denominará <strong>${razonSocial}</strong> y de otra parte <strong>${nombreParte2}</strong>, identificado con ${tipoDocParte2} N° <strong>${numDocParte2}</strong>, con Domicilio en ${domParte2}, quien en adelante se denominará <strong>${rolParte2}</strong>, acuerdan celebrar el presente contrato de confidencialidad de conformidad con las siguientes:
              </p>

      <div class="seccion-consideraciones" style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; font-size: 11pt; font-weight: 800; color: #1E293B; text-transform: uppercase;">
          CONSIDERACIONES PREVIAS
        </h4>
        <p style="text-align: justify; line-height: 1.6; margin: 4px 0;">
          <strong>PRIMERA:</strong> Entre las partes existe un contrato ${esAprendiz ? 'de aprendizaje' : 'laboral'}, donde ${razonSocial} está en calidad de empleador y ${rolParte2} en calidad de trabajador acordaron.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 4px 0;">
          <strong>SEGUNDA:</strong> Como consecuencia de la relación generada entre ${razonSocial} y ${rolParte2}, este último requiere acceder a información de carácter confidencial y datos de carácter personal, propiedad de ${razonSocial} o de terceras personas.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 4px 0;">
          <strong>TERCERA:</strong> Debido a lo anterior ${razonSocial} y ${rolParte2}, acordaron celebrar el presente contrato de confidencialidad.
        </p>
      </div>

      <div class="seccion-clausulas" style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; font-size: 11pt; font-weight: 800; color: #1E293B; text-transform: uppercase;">
          CLÁUSULAS
        </h4>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>PRIMERA: CONFIDENCIALIDAD.</strong> Para los efectos del presente contrato, por información confidencial se entenderá toda aquella información de propiedad de ${razonSocial} o de terceros ya sea esta técnica, financiera, comercial, legal o de cualquier índole y en general cualquier información relacionada con sus operaciones por negocios presentes y/o futuros, que pudiera ser entendida como confidencial, reservada y sensible y que cuya divulgación pudiera generar un perjuicio patrimonial o moral a ${razonSocial}, se incluye sin limitarse a: información y/o listado de clientes actuales y/o potenciales, planes y/o proyectos de negocios, inversión y desarrollo, proyecciones financieras, información de productos y servicios, información de logos, diseños, precios, fórmulas, datos, prototipos, software, know how, y otras informaciones inherentes a los negocios o actividades de ${razonSocial}, independientemente del medio en el que esta información se encuentre ya sea en medios digitales, físicos, verbales o en cualquier otro medio. Se establece que en lo sucesivo la información confidencial se denominará <strong>INFORMACIÓN</strong>.</p>
          <p style="margin-top: 8px;">En el supuesto de que previamente a la celebración del presente contrato ${rolParte2} hubiera tenido acceso a la INFORMACIÓN, aquella estará comprendida dentro del presente contrato para todos los efectos.</p>
          <p style="margin-top: 8px;"><strong>PARÁGRAFO: EXCLUSIONES.</strong> No se entenderá como INFORMACIÓN, para los efectos del presente contrato, aquella que: a) Al momento de su revelación sea de dominio público; b) Luego de su revelación sea publicada o de cualquier forma pase a ser de dominio público, sin que se trate de un incumplimiento del presente contrato por parte de ${rolParte2}; c) Cuente con previa autorización escrita de divulgación de parte de ${razonSocial}; d) Conforme a normativa vigente sea solicitada de manera parcial y/o total por autoridades administrativas o judiciales competentes, caso en el cual antes de realizar su entrega y divulgación ${rolParte2} deberá comunicarlo a ${razonSocial}.</p>
        </div>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>SEGUNDA: OBLIGACIONES DE ${rolParte2}.</strong> ${rolParte2} dará cumplimiento a todas y cada una de las siguientes obligaciones en lo que respecta a la INFORMACIÓN suministrada:</p>
          <ol style="padding-left: 20px; margin: 8px 0;">
            <li>No divulgarla a ningún tercero, salvo que cuente con previa autorización escrita de divulgación de parte de ${razonSocial}, información sobre el trabajo que se desarrolla en ${razonSocial}, no divulgar a ningún tercero estrategias de mercado que se estén desarrollando en ${razonSocial}, no divulgar a ningún tercero información de los procesos que se estén llevando a cabo dentro de ${razonSocial}, no divulgar a ningún tercero información de los documentos que conozca de algún cliente de ${razonSocial}.</li>
            <li>Utilizar la INFORMACIÓN únicamente para los fines propios del contrato y los propósitos que determine ${razonSocial}.</li>
            <li>Custodiar la INFORMACIÓN y hacer controles pertinentes para que la misma no sea divulgada indebidamente.</li>
            <li>Devolver todo documento contentivo de la INFORMACIÓN cuando así lo requiera ${razonSocial}, lo que se entiende por documento contentivo de información confidencial incluye sin limitarse a: papelería, análisis, recopilaciones, estudios, planos, dibujos, gráficos, programas informáticos, aplicativos, base de datos, videos, grabaciones, fotocopias, mensajes de texto, correos electrónicos, información de software que en su momento maneje, entre otros.</li>
            <li>En caso de que así lo requiera ${razonSocial}, certificará el cumplimiento de la solicitud de devolución de que trata el anterior numeral 4, en la forma que aquella ${razonSocial} lo considere y/o disponga.</li>
            <li>Se hace en especial énfasis a la obligación que tiene ${rolParte2} de no hacer ningún tipo de vínculo personal, relación de tipo comercial y/o profesional con ninguna de las personas que figure como cliente anterior y/o potencial, o actual de ${razonSocial}, en sus listados, archivos y demás documentación. Esta obligación estará vigente mientras esté vigente el contrato laboral/formativo a que se hizo referencia en la primera consideración previa, y hasta por <strong>${aniosVigencia} años más</strong> luego de su terminación.</li>
          </ol>
        </div>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>TERCERA: DERECHOS DE PROPIEDAD.</strong> El presente contrato no supone la concesión expresa o implícita a favor de ${rolParte2}, derecho alguno sobre la INFORMACIÓN revelada. En consecuencia, el suministro, generación o uso de la INFORMACIÓN no podrá entenderse en ningún caso como concesión de patente, licencia o derechos de autor, minutas, toda vez que la propiedad de la INFORMACIÓN pertenecerá en todo momento a ${razonSocial}.</p>
        </div>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>CUARTA: PENA POR INCUMPLIMIENTO.</strong> En caso de incumplimiento por parte de ${rolParte2} respecto a cualquiera de las obligaciones contraídas con la celebración del presente contrato se constituirá a su cargo la obligación de pagar a favor de ${razonSocial} el equivalente a <strong>${multaSMMLV} Salarios Mínimos Mensuales Legales Vigentes - S.M.M.L.V</strong> a título de pena.</p>
        </div>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>QUINTA: INTRANSFERIBILIDAD.</strong> El presente contrato se celebra <em>intuito personae</em> entre las partes por lo que no podrá transferirse total o parcialmente sin previa autorización escrita de parte de ${razonSocial}.</p>
        </div>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>SEXTA: LEGISLACIÓN Y JURISDICCIÓN APLICABLE.</strong> El presente contrato se interpretará de conformidad con las leyes colombianas y cualquier diferencia entre las partes en lo que tiene que ver con su interpretación, ejecución, incumplimiento, resolución o nulidad será competencia de la justicia ordinaria colombiana y/o Estados Unidos.</p>
        </div>

        <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.65;">
          <p><strong>SÉPTIMA: DEBER DE RESERVA Y CONFIDENCIALIDAD.</strong> Toda información que reciba o produzca ${rolParte2} dentro del marco de la relación contractual será utilizada de manera confidencial y no será divulgada de forma alguna por fuera de dichas circunstancias o eventos ni compartida con terceros y será únicamente utilizada con el propósito para el cual dicha información es compartida y divulgada. Esta obligación de reserva y confidencialidad consiste en la abstención de usar, facilitar, divulgar o revelar, la información suministrada en virtud de este acuerdo, sin consentimiento expreso por escrito de ${razonSocial}.</p>
        </div>
      </div>

      <p style="margin-top: 24px; text-align: justify; line-height: 1.6;">
        En señal de acuerdo y conformidad, firman las partes el día <strong>${dia} de ${mes.toUpperCase()} del ${anio}</strong>.
      </p>

      ${generarBloqueFirmasDosColumnas(c, {
        rolParte1: 'El Empleador',
        rolParte2: esAprendiz ? 'EL Aprendiz' : 'El Trabajador',
        rolCargoParte2: `${tipoDocParte2}. ${numDocParte2}`,
        rolFirmaParte2: rolFirma,
        esWord,
      })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

/**
 * 3. Genera el HTML del Contrato de Aprendizaje (Ley 789 de 2002)
 */
export function generarHtmlContratoAprendizaje(c, { esWord = false } = {}) {
  const { dia, mes, anio } = getPartesFecha(c.fecha_ingreso)
  const fechaIngresoTexto = formatearFechaLarga(c.fecha_ingreso)
  const fechaFinTexto = formatearFechaLarga(c.fecha_fin)
  const razonSocial = c.razon_social || 'AMERIGLOBAL S.A.S'
  const repLegal = c.representante_legal || 'CARLOS ALBERTO HERRERA'
  const nit = c.nit || '901272369-7'
  const nombreAprendiz = c.nombre_trabajador || '—'
  const tipoDoc = c.tipo_documento || 'TI'
  const numDoc = c.numero_documento || '—'
  const institucion = c.institucion_educativa || 'Servicio Nacional de Aprendizaje - SENA'
  const programa = c.programa_formacion || c.cargo || 'Técnico / Tecnólogo en Formación'
  const etapa = c.etapa_aprendizaje || 'Productiva'
  const apoyo = c.apoyo_sostenimiento || '100% SMMLV + Afiliación a EPS y ARL'

  const encabezadoOficial = generarHtmlEncabezadoOficial({
    titulo: 'CONTRATO DE APRENDIZAJE',
    version: '01',
    edicion: '07/02/2020',
    pagina: '1 De 6',
    esWord,
  })

  return `
    <div class="contrato-documento contrato-aprendizaje">
      <table class="documento-impresion-paginado" style="width: 100%; border-collapse: collapse; border: none;">
        <thead>
          <tr>
            <td style="border: none; padding: 0 0 12px 0;">
              ${encabezadoOficial}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: none; padding: 0;">
              <table class="tabla-datos-contrato" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt;">
        <tbody>
          <tr>
            <td style="width: 32%; font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Empresa Patrocinadora:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 600;">${razonSocial} (NIT ${nit})</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Representante Legal:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${repLegal} — C.C. ${c.cedula_representante || '79778677'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Nombre del Aprendiz:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 700; color: #1E3A8A;">${nombreAprendiz}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Documento de Identidad:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${tipoDoc} ${numDoc}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Dirección del Aprendiz:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${c.direccion_trabajador || 'Medellín-Antioquia'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Institución Educativa:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${institucion}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Especialidad / Programa:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 600;">${programa}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Etapa del Aprendizaje:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;"><strong style="color: #2563EB;">Etapa ${etapa}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Apoyo de Sostenimiento:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px; font-weight: 600;">${apoyo}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Duración y Fechas:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">
              ${numeroAMesesTexto(c.duracion_meses || 6)} &nbsp;|&nbsp; Desde el <strong>${fechaIngresoTexto}</strong> hasta el <strong>${fechaFinTexto}</strong>
            </td>
          </tr>
          <tr>
            <td style="font-weight: 700; border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC;">Lugar y Horario:</td>
            <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">
              ${c.lugar_labores || 'Oficina Medellín'} &nbsp;|&nbsp; ${c.horario || '9:00 AM - 6:00 PM'}
            </td>
          </tr>
        </tbody>
      </table>

      <p class="parrafo-intro" style="text-align: justify; line-height: 1.6; margin-bottom: 14px;">
        Entre los suscritos a saber: por una parte, <strong>${razonSocial}</strong>, debidamente representada por <strong>${repLegal}</strong>, quien en adelante se denominará <strong>LA EMPRESA PATROCINADORA</strong>; y por la otra parte <strong>${nombreAprendiz}</strong>, quien en adelante se denominará <strong>EL APRENDIZ</strong>, se celebra el presente <strong>CONTRATO DE APRENDIZAJE</strong> bajo las siguientes cláusulas:
      </p>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>PRIMERA: OBJETO.</strong> El objeto del presente contrato es facilitar la formación práctica metódica y completa de EL APRENDIZ en la especialidad u oficio referida en el encabezamiento, mediante el auspicio y la práctica formativa en las instalaciones y procesos de LA EMPRESA PATROCINADORA.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>SEGUNDA: OBLIGACIONES DE LA EMPRESA PATROCINADORA.</strong> En virtud de este contrato, la empresa se obliga a: 1. Proporcionar al aprendiz los medios necesarios para la formación técnica y práctica requerida en su especialidad; 2. Afiliar y cotizar oportunamente a EL APRENDIZ a la Entidad Promotora de Salud (EPS) y a la Administradora de Riesgos Laborales (ARL) conforme a la ley; 3. Cancelar oportunamente el apoyo de sostenimiento mensual pactado; 4. Asignar un tutor o coordinador para la orientación y evaluación de su desempeño formativo.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>TERCERA: OBLIGACIONES DEL APRENDIZ.</strong> EL APRENDIZ se compromete a: 1. Concurrir puntualmente a las actividades formativas y prácticas programadas; 2. Someterse a los reglamentos internos, normas de seguridad y disciplina de LA EMPRESA PATROCINADORA; 3. Dedicar su mayor empeño y cuidado para el óptimo aprendizaje y desempeño de las labores asignadas; 4. Cuidar escrupulosamente los equipos, programas, herramientas y bienes puestos a su disposición; 5. Guardar estricta reserva y confidencialidad respecto a la información, secretos comerciales y procesos de la compañía y sus clientes; 6. Cumplir cabalmente el Contrato de Confidencialidad anexo al presente documento.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>CUARTA: APOYO DE SOSTENIMIENTO.</strong> LA EMPRESA PATROCINADORA entregará a EL APRENDIZ un apoyo de sostenimiento mensual equivalente a lo indicado en el encabezado. Se deja expresa constancia de que, de conformidad con el artículo 30 de la Ley 789 de 2002, este apoyo en ningún caso constituye salario, ni genera derecho al pago de prestaciones sociales, cesantías, primas o vacaciones.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>QUINTA: DURACIÓN.</strong> La duración del presente contrato será de ${numeroAMesesTexto(c.duracion_meses || 6)}, contados a partir del ${fechaIngresoTexto} hasta el ${fechaFinTexto}.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>SEXTA: SUSPENSIÓN Y TERMINACIÓN.</strong> La relación de aprendizaje se podrá suspender o dar por terminada por las causales consagradas en la legislación laboral colombiana y en el Acuerdo 015 de 2003 del SENA, entre ellas: el mutuo acuerdo, el vencimiento del plazo pactado, la cancelación de la matrícula por la institución de formación, el bajo rendimiento comprobado o el incumplimiento grave de las obligaciones y normas internas de la empresa.</p>
      </div>

      <div class="clausula" style="margin-bottom: 14px; text-align: justify; line-height: 1.6;">
        <p><strong>SÉPTIMA: CONTRATO DE CONFIDENCIALIDAD ANEXO.</strong> Las partes convienen que, dada la naturaleza de los procesos y el acceso a bases de datos y sistemas corporativos, la firma del CONTRATO DE CONFIDENCIALIDAD es parte integrante e inescindible de este acuerdo formativo.</p>
      </div>

      <p style="margin-top: 24px; text-align: justify; line-height: 1.6;">
        Para constancia se firma en dos ejemplares del mismo tenor por las partes en la ciudad de ${c.ciudad_contrato || 'Medellín'} a los ${dia} días del mes de ${mes} de ${anio}.
      </p>

      ${generarBloqueFirmasDosColumnas(c, {
        rolParte1: 'El Empleador',
        rolParte2: 'EL Aprendiz',
        rolCargoParte2: `${tipoDoc}. ${numDoc}`,
        rolFirmaParte2: programa || 'APRENDIZ',
        esWord,
      })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

/**
 * 4. Genera la Línea de Tiempo interactiva y oficial de Prórrogas Automáticas
 */
export function generarHtmlLineaTiempoProrrogas(c) {
  const infoProrroga = calcularCiclosYProrroga(c)
  if (!infoProrroga) return '<p>No hay información de fechas disponible.</p>'

  const { ciclos, cicloActual, diasParaVencer, diasParaPreaviso, fechaLimitePreaviso, esAprendiz } = infoProrroga

  if (esAprendiz) {
    return `
      <div style="padding: 16px; background: #F8FAFC; border-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; color: #047857;">🎓 Contrato de Aprendizaje (Plazo Fijo Formativo)</h4>
        <p style="margin: 0; font-size: 13px; color: #334155;">
          Este contrato se rige por la Ley 789 de 2002 con una duración fijada en <strong>${c.duracion_meses || 6} meses</strong> (desde ${formatearFechaLarga(c.fecha_ingreso)} hasta ${formatearFechaLarga(c.fecha_fin)}). No contempla prórrogas automáticas laborales salvo suscripción de contrato de trabajo ordinario.
        </p>
      </div>
    `
  }

  const filasCiclos = ciclos.map(item => {
    let badgeEstado = ''
    let bgFila = '#FFFFFF'
    let bordeFila = '1px solid #E2E8F0'

    if (item.superado) {
      badgeEstado = '<span style="background: #E2E8F0; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">✓ Superado</span>'
      bgFila = '#F8FAFC'
    } else if (item.esActual) {
      badgeEstado = '<span style="background: #DCFCE7; color: #15803D; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid #86EFAC;">● Ciclo Vigente Actual</span>'
      bgFila = '#F0FDF4'
      bordeFila = '2px solid #22C55E'
    } else {
      badgeEstado = '<span style="background: #EFF6FF; color: #2563EB; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">⏳ Próxima Renovación Automática</span>'
    }

    return `
      <div style="background: ${bgFila}; border: ${bordeFila}; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 250px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 13.5px; color: #0F172A;">${item.nombre}</strong>
            ${item.esPrueba ? '<span style="background: #FEF3C7; color: #B45309; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">Prueba (2 meses)</span>' : ''}
            ${item.esAnual ? '<span style="background: #EDE9FE; color: #6D28D9; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">⭐ Contrato Anual</span>' : ''}
          </div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
            Vigencia: <strong>${formatearFechaLarga(item.inicio)}</strong> al <strong>${formatearFechaLarga(item.fin)}</strong> (${item.duracionMeses} meses)
          </div>
          <div style="font-size: 11.5px; color: #D97706; margin-top: 3px;">
            ⚠️ Fecha límite preaviso (30 días): <strong>${formatearFechaLarga(item.fechaLimitePreaviso)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          ${badgeEstado}
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="linea-tiempo-prorrogas" style="margin-top: 20px;">
      <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 6px 0; color: #1E40AF; font-size: 15px; font-weight: 800;">
          🔄 Régimen de Renovación Automática del Contrato
        </h3>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #334155; line-height: 1.5;">
          • <strong>Contrato inicial:</strong> Duración de 3 meses, con <strong>2 meses de período de prueba legal</strong> (Art. 78 CST).<br>
          • <strong>Renovación Automática Trimestral:</strong> Al culminar cada ciclo de 3 meses, se prorroga automáticamente por 3 meses más si ninguna de las partes notifica preaviso con 30 días de antelación.<br>
          • <strong>A partir del Año 1:</strong> Cumplido el primer año continuo (4 trimestres), pasa automáticamente a <strong>Contrato Anual (1 año)</strong> renovable año a año (Art. 46 CST).
        </p>
        <div style="background: #FFFFFF; border-radius: 8px; padding: 10px 14px; border: 1px solid #DBEAFE; font-size: 12.5px; color: #1E293B; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            Estado actual: <strong style="color: #2563EB;">${cicloActual.nombre}</strong><br>
            Fin del período en curso: <strong>${formatearFechaLarga(cicloActual.fin)}</strong> (${diasParaVencer > 0 ? `faltan ${diasParaVencer} días` : 'concluido'})
          </div>
          <div style="text-align: right;">
            Fecha límite de preaviso para no renovar:<br>
            <strong style="color: ${diasParaPreaviso <= 15 ? '#B91C1C' : '#B45309'}; font-size: 13px;">${formatearFechaLarga(fechaLimitePreaviso)}</strong>
            <span style="font-size: 11px; display: block; color: #64748B;">(${diasParaPreaviso >= 0 ? `${diasParaPreaviso} días de margen` : 'Preaviso vencido: Se renovó automáticamente'})</span>
          </div>
        </div>
      </div>

      <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">
        Cronograma y Evolución del Contrato:
      </h4>

      ${filasCiclos}
    </div>
  `
}

/**
 * 5. Genera la Carta Oficial de Comunicación / No Renovación / Preaviso
 */
export function generarHtmlCartaTerminacion(c, datosTerminacion = {}, { esWord = false } = {}) {
  const hoyStr = datosTerminacion.fecha_comunicacion || new Date().toISOString().slice(0, 10)
  const { dia, mes, anio } = getPartesFecha(hoyStr)
  const fechaFinEfectiva = datosTerminacion.fecha_efectiva ? formatearFechaLarga(datosTerminacion.fecha_efectiva) : formatearFechaLarga(c.fecha_fin)
  const motivo = datosTerminacion.motivo || 'no_renovacion_trimestre'
  const observaciones = datosTerminacion.observaciones || ''

  const razonSocial = c.razon_social || 'AMERIGLOBAL S.A.S'
  const repLegal = c.representante_legal || 'CARLOS ALBERTO HERRERA'
  const nit = c.nit || '901272369-7'
  const nombreTrabajador = c.nombre_trabajador || '—'
  const tipoDoc = c.tipo_documento || 'CC'
  const numDoc = c.numero_documento || '—'
  const cargo = c.cargo || 'Colaborador'

  const encabezadoOficial = generarHtmlEncabezadoOficial({
    titulo: 'COMUNICACIÓN OFICIAL',
    version: '01',
    edicion: '07/02/2020',
    pagina: '1 De 1',
    esWord,
  })

  let asunto = 'COMUNICACIÓN DE NO RENOVACIÓN DE CONTRATO DE TRABAJO (PREAVISO LEGAL)'
  let parrafoMotivo = ''

  if (motivo === 'no_supero_prueba') {
    asunto = 'COMUNICACIÓN DE TERMINACIÓN DE CONTRATO EN PERÍODO DE PRUEBA'
    parrafoMotivo = `
      Por medio de la presente, nos permitimos comunicarle que la empresa ha tomado la decisión de dar por terminado su contrato de trabajo de manera unilateral, haciendo uso de la facultad legal conferida en el <strong>artículo 80 del Código Sustantivo del Trabajo</strong> y en la Cláusula Quinta de su contrato, correspondiente al <strong>período inicial de prueba</strong>. En consecuencia, su último día de labores en la compañía será el <strong>${fechaFinEfectiva}</strong>.
    `
  } else if (motivo === 'no_renovacion_trimestre' || motivo === 'no_renovacion_anual') {
    asunto = 'COMUNICACIÓN DE NO RENOVACIÓN DE CONTRATO A TÉRMINO FIJO (PREAVISO LEGAL - ART. 46 C.S.T.)'
    parrafoMotivo = `
      De conformidad con lo establecido en el <strong>artículo 46 del Código Sustantivo del Trabajo</strong> (modificado por el artículo 3 de la Ley 50 de 1990) y en la Cláusula Tercera de su contrato individual de trabajo, le informamos con la antelación mínima de treinta (30) días calendario legalmente exigida, que la empresa <strong>ha decidido NO RENOVAR</strong> su contrato de trabajo. En virtud de lo anterior, su vínculo laboral con la empresa finalizará el próximo <strong>${fechaFinEfectiva}</strong>, fecha en la que vence el período pactado.
    `
  } else {
    asunto = 'COMUNICACIÓN DE TERMINACIÓN DE VÍNCULO LABORAL'
    parrafoMotivo = `
      Por medio de la presente, le comunicamos formalmente que su contrato de trabajo con <strong>${razonSocial}</strong> finalizará con efectos a partir del <strong>${fechaFinEfectiva}</strong>, por concepto de: ${observaciones || 'Terminación contractual'}.
    `
  }

  return `
    <div class="contrato-documento carta-terminacion" style="max-width: 750px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.65; color: #0F172A;">
      <table class="documento-impresion-paginado" style="width: 100%; border-collapse: collapse; border: none;">
        <thead>
          <tr>
            <td style="border: none; padding: 0 0 14px 0;">
              ${encabezadoOficial}
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: none; padding: 0;">
              <div style="margin-bottom: 24px; font-size: 11pt;">
                <strong>${c.ciudad_contrato || 'Medellín'}</strong>, ${dia} de ${mes} de ${anio}
              </div>

      <div style="margin-bottom: 24px;">
        Señor(a):<br>
        <strong style="font-size: 12pt; text-transform: uppercase;">${nombreTrabajador}</strong><br>
        ${tipoDoc} N° ${numDoc}<br>
        Cargo: <strong>${cargo}</strong><br>
        ${razonSocial}
      </div>

      <div style="margin-bottom: 20px; font-weight: 800; font-size: 11.5pt; text-decoration: underline;">
        ASUNTO: ${asunto}
      </div>

      <p style="text-align: justify; margin-bottom: 16px;">
        Respetado(a) colaborador(a):
      </p>

      <p style="text-align: justify; margin-bottom: 16px;">
        ${parrafoMotivo}
      </p>

      <p style="text-align: justify; margin-bottom: 16px;">
        Le agradecemos de antemano el tiempo dedicado y los servicios prestados durante su vinculación con nuestra organización. Asimismo, le recordamos su deber de realizar la entrega formal de su puesto de trabajo, equipos, claves, credenciales y cualquier documento contentivo de información reservada y sensible conforme a los términos del <strong>Contrato de Confidencialidad</strong> suscrito entre las partes.
      </p>

      <p style="text-align: justify; margin-bottom: 24px;">
        Su liquidación final de salarios y prestaciones sociales legales le será consignada en su cuenta bancaria habitual dentro de los términos establecidos por la ley laboral colombiana, previa entrega del respectivo paz y salvo interno y realización del examen médico ocupacional de egreso.
      </p>

      <p style="margin-bottom: 40px;">
        Atentamente,
      </p>

      <div style="margin-top: 40px; page-break-inside: avoid;">
        <div style="height: 55px; margin-bottom: 4px;">
          <img src="${obtenerFirmaEmpleador(c)}" alt="Firma ${repLegal}" width="160" height="50" style="display: block; width: 160px; height: 50px; object-fit: contain; border: none;" />
        </div>
        <div style="border-top: 1.5px solid #0F172A; width: 260px; margin-bottom: 6px;"></div>
        <strong style="text-transform: uppercase;">${repLegal}</strong><br>
        Representante Legal<br>
        <strong>${razonSocial}</strong><br>
        NIT ${nit}
      </div>

      <div style="margin-top: 50px; border-top: 1px dashed #CBD5E1; padding-top: 20px; page-break-inside: avoid;">
        <div style="font-size: 10pt; color: #475569; margin-bottom: 8px;">
          <strong>CONSTANCIA DE RECIBIDO POR EL TRABAJADOR:</strong>
        </div>
        <div style="margin-top: 35px;">
          <div style="border-top: 1.5px solid #0F172A; width: 260px; margin-bottom: 6px;"></div>
          Firma: _________________________________________<br>
          Nombre: <strong>${nombreTrabajador}</strong><br>
          C.C. N°: ${numDoc}<br>
          Fecha y Hora de Recibido: _____ / _____ / _________ &nbsp; ____ : ____
        </div>
      </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

/**
 * Genera el documento completo según la vista seleccionada:
 * 'completo' | 'principal' | 'confidencialidad' | 'linea_tiempo' | 'carta_terminacion'
 */
export function generarHtmlDocumento(c, vista = 'completo', datosExtra = {}, opciones = {}) {
  const esAprendiz = c.tipo_contrato === 'aprendizaje'
  const htmlPrincipal = esAprendiz ? generarHtmlContratoAprendizaje(c, opciones) : generarHtmlContratoLaboral(c, opciones)
  const htmlConfidencialidad = generarHtmlConfidencialidad(c, opciones)

  if (vista === 'principal') return htmlPrincipal
  if (vista === 'confidencialidad') return htmlConfidencialidad
  if (vista === 'linea_tiempo') return generarHtmlLineaTiempoProrrogas(c)
  if (vista === 'carta_terminacion') return generarHtmlCartaTerminacion(c, datosExtra, opciones)
  return `
    ${htmlPrincipal}
    <div class="salto-pagina-impresion" style="page-break-before: always; break-before: page; margin: 30px 0; border-top: 2px dashed #94A3B8;"></div>
    ${htmlConfidencialidad}
  `
}

/**
 * Abre la ventana de impresión con los estilos óptimos para PDF y papel A4,
 * repitiendo el encabezado oficial en cada hoja impresa.
 */
export function imprimirContrato(c, vista = 'completo', datosExtra = {}) {
  const titulo = c.tipo_contrato === 'aprendizaje'
    ? `Contrato_Aprendizaje_${(c.nombre_trabajador || 'Aprendiz').replace(/\s+/g, '_')}`
    : `Contrato_Laboral_${(c.nombre_trabajador || 'Trabajador').replace(/\s+/g, '_')}`

  const win = window.open('', '_blank', 'width=950,height=1000')
  if (!win) {
    alert('Por favor habilita las ventanas emergentes en tu navegador para ver e imprimir el contrato.')
    return
  }

  const contenido = generarHtmlDocumento(c, vista, datosExtra, { esWord: false })

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm 16mm 14mm 16mm;
        }
        body {
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #0F172A;
          background: #fff;
          margin: 0;
          padding: 20px;
          font-size: 10pt;
          line-height: 1.55;
        }
        .no-print {
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          padding: 12px 18px;
          margin-bottom: 24px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .btn-print {
          background: #2563EB;
          color: #fff;
          border: none;
          padding: 9px 18px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-print:hover { background: #1D4ED8; }

        /* Estructura para repetir encabezado en cada página impresa */
        table.documento-impresion-paginado {
          width: 100% !important;
          border-collapse: collapse !important;
          border: none !important;
          background: transparent !important;
        }
        table.documento-impresion-paginado > thead {
          display: table-header-group !important;
        }
        table.documento-impresion-paginado > tbody {
          display: table-row-group !important;
        }
        table.documento-impresion-paginado > tbody > tr {
          page-break-inside: auto !important;
        }

        /* Encabezado oficial cuadrícula */
        .tabla-encabezado-oficial {
          width: 100% !important;
          border-collapse: collapse !important;
          border: 1.5px solid #000000 !important;
          margin-bottom: 16px !important;
          background: #ffffff !important;
          page-break-inside: avoid !important;
        }
        .tabla-encabezado-oficial td {
          border: 1px solid #000000 !important;
        }

        .tabla-datos-contrato td {
          font-size: 9.5pt;
          line-height: 1.4;
        }
        ol li, ul li {
          margin-bottom: 6px;
          text-align: justify;
        }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0 !important; margin: 0 !important; }
          .salto-pagina-impresion {
            page-break-before: always !important;
            break-before: page !important;
            height: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: auto;
          }
          .firmas-grid, table.tabla-firmas-contrato {
            page-break-inside: avoid !important;
          }
          table.tabla-firmas-contrato, table.tabla-firmas-contrato td {
            border: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <div>
          <strong style="color: #1E40AF; font-size: 14px;">📑 Vista previa de impresión oficial</strong>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">
            Encabezado de calidad institucional visible en cada hoja del contrato.
          </div>
        </div>
        <button class="btn-print" onclick="window.print()">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>
      ${contenido}
      <script>
        setTimeout(() => { window.print(); }, 400);
      </script>
    </body>
    </html>
  `)
  win.document.close()
}

/**
 * Descarga el contrato como archivo compatible con Microsoft Word (.doc)
 * configurando los campos dinámicos de página y cuadrícula oficial.
 */
export function descargarComoWord(c, vista = 'completo') {
  const titulo = c.tipo_contrato === 'aprendizaje'
    ? `Contrato_Aprendizaje_${(c.nombre_trabajador || 'Aprendiz').replace(/\s+/g, '_')}.doc`
    : `Contrato_Laboral_${(c.nombre_trabajador || 'Trabajador').replace(/\s+/g, '_')}.doc`

  const contenido = generarHtmlDocumento(c, vista, {}, { esWord: true })

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${titulo}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.0cm 29.7cm;
          margin: 2.0cm 2.0cm 2.0cm 2.0cm;
          mso-header-margin: 0.8cm;
          mso-footer-margin: 0.8cm;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 14pt; }
        .tabla-encabezado-oficial { width: 100% !important; border-collapse: collapse !important; border: 1.5pt solid #000 !important; margin-bottom: 8pt !important; }
        .tabla-encabezado-oficial td { border: 1pt solid #000 !important; padding: 2pt 4pt !important; vertical-align: middle !important; }
        .tabla-encabezado-oficial p, .tabla-encabezado-oficial div { margin: 0 !important; }
        .clausula { margin-bottom: 10pt; text-align: justify; }
        .firmas-grid { margin-top: 40pt; }
        table.tabla-firmas-contrato { border: none !important; width: 100% !important; margin-top: 35pt !important; margin-bottom: 20pt !important; border-collapse: collapse !important; }
        table.tabla-firmas-contrato td { border: none !important; padding: 4pt 10pt !important; vertical-align: top !important; }
        table.documento-impresion-paginado, table.documento-impresion-paginado td { border: none !important; padding: 0 !important; }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${contenido}
      </div>
    </body>
    </html>
  `

  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = titulo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
