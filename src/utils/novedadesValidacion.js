// Valida las fechas de una novedad contra la ficha del empleado en
// Empleados.jsx (fecha_ingreso / activo / fecha_retiro). Esa es la fuente
// de verdad de cuándo el empleado entró y salió de la empresa, y NO
// depende de que existan novedades manuales de "Ingreso" o "Terminación
// de Contrato" (esas son opcionales y muchas veces no se cargan).
export function validarContraFichaEmpleado(data, fichasEmpleados) {
  if (!data.fecha_inicio) return null
  const ficha = fichasEmpleados[data.nombre_empleado]
  if (!ficha) return null // empleado sin ficha (p.ej. ya no existe en Empleados): no se valida

  const fechas = [data.fecha_inicio, data.fecha_fin].filter(Boolean)

  // Si tiene lista de periodos laborales registrados en la ficha
  if (ficha.periodos && ficha.periodos.length > 0) {
    const fIni = data.fecha_inicio
    const fFin = data.fecha_fin || data.fecha_inicio

    const periodoValido = ficha.periodos.some(p => {
      const matchIngreso = !p.fecha_ingreso || fIni >= p.fecha_ingreso
      const matchRetiro = !p.fecha_retiro || fFin <= p.fecha_retiro
      return matchIngreso && matchRetiro
    })

    if (!periodoValido) {
      const primerIngreso = ficha.periodos.reduce((min, p) => (!min || (p.fecha_ingreso && p.fecha_ingreso < min) ? p.fecha_ingreso : min), null)
      if (primerIngreso && fIni < primerIngreso) {
        return `${data.nombre_empleado} ingresó a la empresa el ${primerIngreso}. No se puede registrar una novedad con fecha ${fIni}, anterior a su primer ingreso.`
      }
      return `Las fechas (${fIni}${data.fecha_fin ? ` a ${data.fecha_fin}` : ''}) no se encuentran dentro de ningún periodo laboral registrado para ${data.nombre_empleado}.`
    }
    return null
  }

  // Fallback: Si no tiene lista de periodos, validar contra los campos directos de la ficha
  if (ficha.fecha_ingreso) {
    const antesDeIngreso = fechas.find(f => f < ficha.fecha_ingreso)
    if (antesDeIngreso) {
      return `${data.nombre_empleado} ingresó a la empresa el ${ficha.fecha_ingreso}. No se puede registrar una novedad con fecha ${antesDeIngreso}, anterior a su ingreso.`
    }
  }

  if (!ficha.activo && ficha.fecha_retiro) {
    const despuesDeRetiro = fechas.find(f => f > ficha.fecha_retiro)
    if (despuesDeRetiro) {
      return `${data.nombre_empleado} se retiró de la empresa el ${ficha.fecha_retiro}. No se puede registrar una novedad con fecha ${despuesDeRetiro}, posterior a su retiro. Si esto es un error, actualiza la ficha del empleado en Empleados.`
    }
  }

  return null
}

// Valida que las fechas de una novedad caigan dentro de un tramo en que el
// empleado estaba activo, según su historial de Ingreso / Terminación de
// Contrato. Una persona puede irse y volver más de una vez, así que se
// arman todos los tramos (Ingreso → siguiente Terminación, o hasta hoy si
// sigue activo) y se valida contra todos ellos.
export function validarContraHistorial(data, rows) {
  // Las novedades que EN SÍ MISMAS son Ingreso/Terminación de Contrato
  // son las que definen el historial: no se validan contra él.
  if (data.concepto === 'Ingreso' || data.concepto === 'Terminación de Contrato') return null
  if (!data.fecha_inicio) return null

  const historial = rows
    .filter(r => r.nombre_empleado === data.nombre_empleado
      && (r.concepto === 'Ingreso' || r.concepto === 'Terminación de Contrato')
      && r.fecha_inicio
      && r.id !== data.id) // al editar, no contar el propio registro
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  if (historial.length === 0) return null // sin historial registrado: no se valida

  const tramosActivos = []
  let ingresoActual = null
  for (const h of historial) {
    if (h.concepto === 'Ingreso') {
      ingresoActual = h.fecha_inicio
    } else if (ingresoActual) {
      tramosActivos.push({ desde: ingresoActual, hasta: h.fecha_inicio })
      ingresoActual = null
    }
  }
  if (ingresoActual) tramosActivos.push({ desde: ingresoActual, hasta: null }) // sigue activo

  const dentroDeTramo = (fecha) => tramosActivos.some(t => fecha >= t.desde && (t.hasta === null || fecha <= t.hasta))

  if (!dentroDeTramo(data.fecha_inicio)) {
    return `La fecha de inicio (${data.fecha_inicio}) no cae dentro de ningún periodo activo de ${data.nombre_empleado} según su historial de ingreso/salida.`
  }
  if (data.fecha_fin && !dentroDeTramo(data.fecha_fin)) {
    return `La fecha de fin (${data.fecha_fin}) no cae dentro de ningún periodo activo de ${data.nombre_empleado} según su historial de ingreso/salida.`
  }
  return null
}

// Normaliza el formulario antes de guardar (fechas vacías → null).
export function sanitizeForm(data) {
  return {
    ...data,
    fecha_inicio: data.fecha_inicio || null,
    fecha_fin: data.fecha_fin || null,
    total_dias: data.total_dias === '' ? null : data.total_dias,
  }
}