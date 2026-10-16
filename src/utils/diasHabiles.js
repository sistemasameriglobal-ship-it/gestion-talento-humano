// Calendario de festivos colombianos (fijos, Ley Emiliani y basados en
// Pascua) y cálculo de días hábiles entre dos fechas. Se usa tanto en
// Vacaciones como en Novedades (concepto "Vacaciones") para que el conteo
// de días sea siempre el mismo en los dos módulos.

export function getFestivosCol(year) {
  // Fijos
  const fijos = [
    `${year}-01-01`, // Año Nuevo
    `${year}-05-01`, // Día del Trabajo
    `${year}-07-20`, // Independencia
    `${year}-08-07`, // Batalla de Boyacá
    `${year}-12-08`, // Inmaculada Concepción
    `${year}-12-25`, // Navidad
  ]

  // Emiliani (se trasladan al siguiente lunes)
  const emiliani = [
    [1, 6],   // Reyes Magos
    [3, 19],  // San José
    [6, 29],  // San Pedro y San Pablo
    [8, 15],  // Asunción
    [10, 12], // Día de la Raza
    [11, 1],  // Todos los Santos
    [11, 11], // Independencia de Cartagena
  ]

  function nextMonday(d) {
    const r = new Date(d)
    const dow = r.getDay()
    if (dow === 1) return r
    r.setDate(r.getDate() + ((8 - dow) % 7))
    return r
  }

  const toISO = d => d.toISOString().split('T')[0]

  const emilianiDates = emiliani.map(([m, d]) => {
    const fecha = new Date(year, m - 1, d)
    return toISO(nextMonday(fecha))
  })

  // Pascua (algoritmo de Butcher)
  function pascua(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100
    const d = Math.floor(b / 4), e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4), k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m2 = Math.floor((a + 11 * h + 22 * l) / 451)
    const mes = Math.floor((h + l - 7 * m2 + 114) / 31)
    const dia = ((h + l - 7 * m2 + 114) % 31) + 1
    return new Date(y, mes - 1, dia)
  }

  const p = pascua(year)
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

  // Basados en Pascua
  const pascuaDates = [
    toISO(addDays(p, -7)),  // Domingo de Ramos
    toISO(addDays(p, -3)),  // Jueves Santo
    toISO(addDays(p, -2)),  // Viernes Santo
    toISO(p),               // Domingo de Pascua
    toISO(nextMonday(addDays(p, 43))),  // Ascensión (Emiliani)
    toISO(nextMonday(addDays(p, 64))),  // Corpus Christi (Emiliani)
    toISO(nextMonday(addDays(p, 71))),  // Sagrado Corazón (Emiliani)
  ]

  return new Set([...fijos, ...emilianiDates, ...pascuaDates])
}

export function diasHabilesEntre(inicio, fin) {
  if (!inicio || !fin) return ''
  let count = 0
  const cur = new Date(inicio + 'T00:00:00')
  const end = new Date(fin + 'T00:00:00')
  const yearsSeen = new Set()
  const festivosCache = {}

  while (cur <= end) {
    const y = cur.getFullYear()
    if (!yearsSeen.has(y)) { festivosCache[y] = getFestivosCol(y); yearsSeen.add(y) }
    const dow = cur.getDay()
    const iso = cur.toISOString().split('T')[0]
    // Lunes(1) a Sábado(6), sin festivos
    if (dow !== 0 && !festivosCache[y].has(iso)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/**
 * Calcula la fecha efectiva de regreso laboral (siguiente día hábil de lunes a viernes
 * que no sea festivo en Colombia) a partir de la fecha de finalización de una incapacidad/novedad.
 * @param {string} fechaFin - Fecha fin en formato 'YYYY-MM-DD'
 * @returns {string} Fecha de regreso en formato 'YYYY-MM-DD'
 */
export function obtenerFechaRegresoLaboral(fechaFin) {
  if (!fechaFin) return ''
  const clean = String(fechaFin).trim().slice(0, 10)
  const parts = clean.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return clean

  const cur = new Date(parts[0], parts[1] - 1, parts[2])
  // Sumar 1 día calendario a fechaFin
  cur.setDate(cur.getDate() + 1)

  const fmtISO = (dt) => {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const festivosCache = {}
  while (true) {
    const y = cur.getFullYear()
    if (!festivosCache[y]) festivosCache[y] = getFestivosCol(y)
    const dow = cur.getDay() // 0 = Domingo, 6 = Sábado
    const iso = fmtISO(cur)
    if (dow !== 0 && dow !== 6 && !festivosCache[y].has(iso)) {
      return iso
    }
    cur.setDate(cur.getDate() + 1)
  }
}

