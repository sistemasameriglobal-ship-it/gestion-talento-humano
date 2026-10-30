import { useEffect } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'
import AnimatedModal from '../ui/AnimatedModal'
import SearchableSelect from '../ui/SearchableSelect'
import { PILL_STYLES } from './pillsConstants'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { hoyISO, formatDuracion } from '../../utils/fecha'
import { diasHabilesEntre } from '../../utils/diasHabiles'
import { CONCEPTOS_LIST, ICONOS } from '../../utils/novedadesConstants'
import { MESES_OPCIONES } from '../../constants'
import { obtenerPeriodoPorFecha } from '../../utils/novedadesValidacion'

const formatPeriodoLabel = (p) => {
  if (!p) return ''
  const parts = String(p).trim().split('-')
  if (parts.length === 2) {
    const m = parts[1]
    const mesObj = MESES_OPCIONES.find(x => x.val === m || parseInt(x.val, 10) === parseInt(m, 10))
    if (mesObj) return `${p} · ${mesObj.label}`
  }
  return p
}

const agruparPeriodos = (items) => {
  const grupos = {}
  for (const p of items) {
    if (!p) continue
    const y = p.includes('-') ? p.split('-')[0] : 'Otros'
    if (!grupos[y]) grupos[y] = []
    grupos[y].push(p)
  }
  return grupos
}

export default function NovedadFormModal({
  modal, form, setForm, setFormDirty, formError, saving,
  nuevoPeriodoMode, setNuevoPeriodoMode,
  empleados, fichasEmpleados, rows, periodosForm, dependencias,
  sinFechas, minFechaForm, maxFechaForm,
  f, save, closeModal,
}) {
  // Auto-completar dependencia / área según el período correspondiente
  // Si la novedad tiene fecha correspondiente a un período previo (ej. Ventas antes de Underwriting),
  // se asigna automáticamente su área histórica de esa fecha.
  useEffect(() => {
    if (!modal || !form.nombre_empleado) return
    const ficha = fichasEmpleados?.[form.nombre_empleado] ||
      Object.values(fichasEmpleados || {}).find(f => (f.nombre_completo || '').trim().toLowerCase() === form.nombre_empleado.trim().toLowerCase())
    if (!ficha) return

    // Buscar si a la fecha de la novedad pertenecía a un período específico (área previa)
    const periodoFecha = obtenerPeriodoPorFecha(ficha.periodos, form.fecha_inicio)
    const depObjetivo = periodoFecha?.dependencia || ficha.dependencia || ''
    const cargoObjetivo = periodoFecha?.cargo || ficha.cargo || ''

    setForm(p => {
      let changed = false
      const next = { ...p }
      const listaAreasConocidas = [
        ficha.dependencia,
        ...(ficha.periodos || []).map(per => per.dependencia)
      ].filter(Boolean)

      // Si depObjetivo está definido y el campo dependencia está vacío o coincide con alguna área conocida del colaborador
      if (depObjetivo && (!next.dependencia || listaAreasConocidas.includes(next.dependencia))) {
        const depMatch = (dependencias || []).find(d => d.trim().toLowerCase() === depObjetivo.trim().toLowerCase()) || depObjetivo
        if (next.dependencia !== depMatch) {
          next.dependencia = depMatch
          changed = true
        }
        if (cargoObjetivo && next.cargo !== cargoObjetivo && (!next.cargo || [ficha.cargo, ...(ficha.periodos || []).map(per => per.cargo)].includes(next.cargo))) {
          next.cargo = cargoObjetivo
          changed = true
        }
        if (ficha?.id && !next.empleado_id) {
          next.empleado_id = ficha.id
          changed = true
        }
      }
      if (modal === 'add' && next.concepto === 'Ingreso' && ficha?.fecha_ingreso && (!next.fecha_inicio || next.fecha_inicio !== ficha.fecha_ingreso)) {
        next.fecha_inicio = ficha.fecha_ingreso
        next.fecha_fin = ficha.fecha_ingreso
        next.periodo = ficha.fecha_ingreso.slice(0, 7)
        next.total_dias = 0
        changed = true
      }
      return changed ? next : p
    })
  }, [modal, form.nombre_empleado, form.fecha_inicio, form.concepto, fichasEmpleados, dependencias, setForm])

  return (
    <AnimatedModal open={!!modal} onRequestClose={closeModal}>
      {modal && (() => {
        const concepto = form.concepto || 'Incapacidad'
        const conceptoColor = CONCEPTO_COLORS[normalizarConcepto(concepto)] || '#374151'

        const PillBtn = ({ field, opciones }) => {
          const val = form[field] || ''
          const next = () => {
            const idx = opciones.indexOf(val)
            setForm(p => ({ ...p, [field]: opciones[(idx + 1) % opciones.length] }))
            setFormDirty(true)
          }
          const pillStyle = (v) => {
            const lv = (v || '').toLowerCase().trim()
            if (!v) return { background: 'var(--surface)', color: 'var(--text-muted)', border: '1.5px dashed var(--border)' }
            if (lv === 'ok' || lv.startsWith('ok-')) return { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1.5px solid color-mix(in srgb, var(--success) 35%, transparent)' }
            if (lv === 'validar') return { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1.5px solid color-mix(in srgb, var(--warning) 40%, transparent)' }
            if (lv === 'n/a') return { background: 'var(--bg)', color: '#374151', border: '1.5px solid #D1D5DB' }
            if (lv === 'sí' || lv === 'si') return { background: 'var(--info-bg)', color: 'var(--info-text)', border: '1.5px solid color-mix(in srgb, var(--info) 35%, transparent)' }
            if (lv === 'no') return { background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1.5px solid color-mix(in srgb, var(--danger) 35%, transparent)' }
            return { background: 'var(--purple-bg)', color: 'var(--purple-text)', border: '1.5px solid color-mix(in srgb, var(--purple) 35%, transparent)' }
          }
          return (
            <button type="button" onClick={next} title="Clic para cambiar"
              style={{
                ...pillStyle(val), padding: '6px 14px', borderRadius: 999, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap'
              }}>
              {val || <span style={{ opacity: .5 }}>— Sin valor —</span>}
              <span style={{ opacity: .4, fontSize: 10 }}>↻</span>
            </button>
          )
        }

        const OkBtnGroup = ({ field }) => {
          const ops = ['', 'OK-DIANA', 'OK-ANDRES', 'OK-ALEJANDRO', 'VALIDAR']
          const val = form[field] || ''
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ops.map(op => {
                const sel = val === op
                const lop = (op || '').toLowerCase()
                const col = !op ? '#6B7280' : lop === 'validar' ? 'var(--warning-text)' : 'var(--success-text)'
                const bg = !op ? 'var(--surface)' : lop === 'validar' ? (sel ? 'var(--warning-bg)' : 'var(--surface)') : (sel ? 'var(--success-bg)' : 'var(--surface)')
                const brd = !op ? 'var(--border)' : lop === 'validar' ? 'color-mix(in srgb, var(--warning) 40%, transparent)' : 'color-mix(in srgb, var(--success) 35%, transparent)'
                return (
                  <button key={op || 'none'} type="button"
                    onClick={() => { setForm(p => ({ ...p, [field]: op })); setFormDirty(true) }}
                    style={{
                      padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${sel ? brd : 'var(--border)'}`, background: sel ? bg : 'var(--surface)',
                      color: sel ? col : 'var(--text-muted)', transition: 'all .15s',
                      boxShadow: sel ? `0 0 0 2px ${brd}` : 'none'
                    }}>
                    {op || '—'}
                  </button>
                )
              })}
            </div>
          )
        }

        const campos = [form.nombre_empleado, form.concepto, form.periodo]
        const pct = Math.round((campos.filter(Boolean).length / campos.length) * 100)

        return (
          <>
            {/* Cabecera dinámica */}
            <div style={{
              background: `linear-gradient(135deg,${conceptoColor}cc 0%,${conceptoColor}88 100%)`,
              padding: '22px 24px 16px', borderRadius: '12px 12px 0 0', transition: 'background .4s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                }}>
                  {ICONOS[concepto] || '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                    {modal === 'add' ? 'Nueva novedad' : 'Editando novedad'}
                  </div>
                  <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.nombre_empleado || 'Selecciona un empleado'}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      {concepto}
                    </span>
                    {form.periodo && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>📅 {form.periodo}</span>}
                    {form.total_dias && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>⏱ {form.total_dias}d</span>}
                  </div>
                </div>
                <button onClick={closeModal} className="modal-close-btn"
                  style={{
                    border: 'none', borderRadius: 10, color: '#fff',
                    cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center',
                    flexShrink: 0, transition: 'background .15s'
                  }}>
                  <X size={16} />
                </button>
              </div>
              {/* Barra de progreso */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>COMPLETADO</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.85)', width: `${pct}%`, transition: 'width .3s ease' }} />
                </div>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* S1: Empleado */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Empleado *</span>
                </div>
                <SearchableSelect
                  value={form.nombre_empleado}
                  onChange={val => {
                    const ficha = fichasEmpleados?.[val] ||
                      Object.values(fichasEmpleados || {}).find(f => (f.nombre_completo || '').trim().toLowerCase() === (val || '').trim().toLowerCase())
                    const periodoFecha = obtenerPeriodoPorFecha(ficha?.periodos, form.fecha_inicio)
                    const depFicha = periodoFecha?.dependencia || ficha?.dependencia || ''
                    const depMatch = depFicha ? ((dependencias || []).find(d => d.trim().toLowerCase() === depFicha.trim().toLowerCase()) || depFicha) : ''
                    setForm(p => ({
                      ...p,
                      nombre_empleado: ficha?.nombre_completo || val,
                      empleado_id: ficha?.id || p.empleado_id || null,
                      dependencia: depMatch,
                      cargo: periodoFecha?.cargo || ficha?.cargo || p.cargo || '',
                    }))
                    setFormDirty(true)
                  }}
                  activos={empleados.activos} inactivos={empleados.inactivos}
                  placeholder="— Seleccionar empleado —"
                />
                {form.nombre_empleado && (() => {
                  const ficha = fichasEmpleados?.[form.nombre_empleado] ||
                    Object.values(fichasEmpleados || {}).find(f => (f.nombre_completo || '').trim().toLowerCase() === form.nombre_empleado.trim().toLowerCase())
                  if (!ficha) return null
                  const periodoFecha = obtenerPeriodoPorFecha(ficha.periodos, form.fecha_inicio)
                  const esAreaHistorica = periodoFecha?.dependencia && periodoFecha.dependencia !== ficha.dependencia
                  return (
                    <>
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>💼 <strong>{form.cargo || periodoFecha?.cargo || ficha.cargo || 'Sin cargo'}</strong></span>
                        <span>·</span>
                        <span>🏢 <strong>{form.dependencia || periodoFecha?.dependencia || ficha.dependencia || 'Sin área'}</strong></span>
                        {esAreaHistorica && (
                          <span style={{ fontSize: 10.5, background: '#DBEAFE', color: '#1E40AF', padding: '1px 7px', borderRadius: 99, fontWeight: 700, border: '1px solid #BFDBFE' }}>
                            Área en fecha de novedad
                          </span>
                        )}
                      </div>
                      {esAreaHistorica && (
                        <div style={{
                          marginTop: 8, fontSize: 11.5, color: '#1E3A8A', background: '#EFF6FF',
                          border: '1px solid #BFDBFE', borderRadius: 8, padding: '7px 10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, lineHeight: 1.4,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <Info size={14} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <strong>Área histórica detectada:</strong> En la fecha seleccionada ({form.fecha_inicio || 'sin fecha'}), el colaborador pertenecía al área <strong>"{periodoFecha.dependencia}"</strong> (cargo: <strong>"{periodoFecha.cargo || ficha.cargo}"</strong>). Su área actual en ficha es "{ficha.dependencia}".
                            </div>
                          </div>
                          {form.dependencia !== periodoFecha.dependencia && (
                            <button
                              type="button"
                              onClick={() => {
                                const depMatch = (dependencias || []).find(d => d.trim().toLowerCase() === periodoFecha.dependencia.trim().toLowerCase()) || periodoFecha.dependencia
                                setForm(p => ({
                                  ...p,
                                  dependencia: depMatch,
                                  cargo: periodoFecha.cargo || p.cargo,
                                }))
                                setFormDirty(true)
                              }}
                              style={{
                                background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6,
                                padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                              }}
                            >
                              Asignar {periodoFecha.dependencia}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
                {form.nombre_empleado && !fichasEmpleados[form.nombre_empleado]?.activo && (
                  <div style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)', color: 'var(--warning-text)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 600,
                  }}>
                    <AlertCircle size={13} />
                    Este empleado está inactivo{fichasEmpleados[form.nombre_empleado]?.fecha_retiro
                      ? ` desde el ${fichasEmpleados[form.nombre_empleado].fecha_retiro}`
                      : ''}. Solo se pueden registrar novedades con fecha dentro de su periodo activo.
                  </div>
                )}
                {form.nombre_empleado && (() => {
                  let historial = rows
                    .filter(r => r.nombre_empleado === form.nombre_empleado && (r.concepto === 'Ingreso' || r.concepto === 'Terminación de Contrato' || r.concepto === 'No renovación de contrato' || r.concepto === 'Renuncia' || r.concepto === 'Renuncia/Retiro') && r.fecha_inicio)
                    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
                  let esRespaldoFicha = false
                  const ficha = fichasEmpleados[form.nombre_empleado]

                  // Caso 1: si no hay novedades de Ingreso/Terminación, armar historial
                  // a partir de sus periodos laborales registrados o de su ficha.
                  if (historial.length === 0 && ficha?.periodos && ficha.periodos.length > 0) {
                    esRespaldoFicha = true
                    historial = []
                    ficha.periodos
                      .slice()
                      .sort((a, b) => (a.fecha_ingreso || '').localeCompare(b.fecha_ingreso || ''))
                      .forEach(p => {
                        if (p.fecha_ingreso) {
                          historial.push({ id: `p-ing-${p.id}`, concepto: 'Ingreso', fecha_inicio: p.fecha_ingreso })
                        }
                        if (p.fecha_retiro) {
                          historial.push({ id: `p-ret-${p.id}`, concepto: 'Terminación de Contrato', fecha_inicio: p.fecha_retiro })
                        }
                      })
                  } else if (historial.length === 0 && ficha?.fecha_ingreso) {
                    esRespaldoFicha = true
                    historial = [{ id: 'ficha-ingreso', concepto: 'Ingreso', fecha_inicio: ficha.fecha_ingreso }]
                    if (ficha.activo === false && ficha.fecha_retiro) {
                      historial.push({ id: 'ficha-retiro', concepto: 'Terminación de Contrato', fecha_inicio: ficha.fecha_retiro })
                    }
                  }

                  // Caso 2: SÍ hay novedades, pero quedaron "a medias" — el último
                  // tramo es un Ingreso sin su Terminación después (por ejemplo,
                  // se cargó el Ingreso por Excel pero el retiro solo se marcó en
                  // Empleados, nunca como novedad). Sin esto, se mostraría a la
                  // persona como si siguiera activa aunque ya no lo esté. Se
                  // completa con la fecha de retiro real de la ficha.
                  const ultimoTramo = historial[historial.length - 1]
                  if (ultimoTramo && ultimoTramo.concepto === 'Ingreso'
                      && ficha && ficha.activo === false && ficha.fecha_retiro
                      && ficha.fecha_retiro >= ultimoTramo.fecha_inicio) {
                    esRespaldoFicha = true
                    historial = [...historial, { id: 'ficha-retiro', concepto: 'Terminación de Contrato', fecha_inicio: ficha.fecha_retiro }]
                  }

                  if (historial.length === 0) return null
                  const haVuelto = historial.filter(h => h.concepto === 'Ingreso').length > 1
                  const hoy = hoyISO()
                  return (
                    <div style={{ marginTop: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historial ingreso / salida</span>
                        {haVuelto && <span style={PILL_STYLES.validar}>🔁 Ha vuelto</span>}
                      </div>
                      {esRespaldoFicha && (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10, marginTop: -6 }}>
                          Tomado de su ficha en Empleados (no tiene novedades de Ingreso/Terminación registradas).
                        </div>
                      )}
                      <div>
                        {historial.map((h, idx) => {
                          const esIngreso = h.concepto === 'Ingreso'
                          const esUltimo = idx === historial.length - 1
                          const fechaFinTramo = esUltimo ? (esIngreso ? hoy : null) : historial[idx + 1].fecha_inicio
                          let duracionTexto = null
                          if (fechaFinTramo) {
                            const dur = formatDuracion(h.fecha_inicio, fechaFinTramo)
                            duracionTexto = esIngreso && esUltimo ? `Lleva ${dur} (actual)` : esIngreso ? `Estuvo ${dur}` : `Fuera ${dur}`
                          }
                          return (
                            <div key={h.id} style={{ display: 'flex', gap: 10 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: esIngreso ? '#22C55E' : '#EF4444', marginTop: 3, flexShrink: 0 }} />
                                {!esUltimo && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 28 }} />}
                              </div>
                              <div style={{ paddingBottom: esUltimo ? 0 : 16 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{esIngreso ? 'Ingreso' : 'Salida'} — {h.fecha_inicio}</div>
                                {duracionTexto && (
                                  <div style={{ fontSize: 11.5, color: esIngreso && esUltimo ? 'var(--success-text)' : 'var(--text-muted)', fontWeight: esIngreso && esUltimo ? 600 : 400, marginTop: 1 }}>{duracionTexto}</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S2: Concepto */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📋</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Concepto *</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {CONCEPTOS_LIST.map(c => {
                    const sel = form.concepto === c
                    const col = CONCEPTO_COLORS[normalizarConcepto(c)] || '#374151'
                    return (
                      <button key={c} type="button"
                        onClick={() => {
                          setForm(p => {
                            const next = { ...p, concepto: c }
                            if (c === 'Ingreso') {
                              const ficha = fichasEmpleados?.[p.nombre_empleado] ||
                                Object.values(fichasEmpleados || {}).find(f => (f.nombre_completo || '').trim().toLowerCase() === (p.nombre_empleado || '').trim().toLowerCase())
                              if (ficha?.fecha_ingreso) {
                                next.fecha_inicio = ficha.fecha_ingreso
                                next.fecha_fin = ficha.fecha_ingreso
                                next.periodo = ficha.fecha_ingreso.slice(0, 7)
                                next.total_dias = 0
                              }
                            }
                            return next
                          })
                          setFormDirty(true)
                        }}
                        style={{
                          padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: sel ? `2px solid ${col}` : '1.5px solid var(--border)',
                          background: sel ? col + '22' : 'var(--surface)',
                          color: sel ? col : 'var(--text-muted)',
                          transition: 'all .15s',
                          boxShadow: sel ? `0 0 0 2px ${col}33` : 'none',
                          transform: sel ? 'translateY(-1px)' : 'none',
                        }}>
                        {ICONOS[c] || '📄'} {c}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Período (YYYY-MM)</label>
                    <select className="form-control"
                      value={nuevoPeriodoMode ? '__nuevo__' : (form.periodo || '')}
                      onChange={e => {
                        const v = e.target.value
                        if (v === '__nuevo__') {
                          setNuevoPeriodoMode(true)
                          setForm(p => ({ ...p, periodo: '' }))
                        } else {
                          setNuevoPeriodoMode(false)
                          setForm(p => ({ ...p, periodo: v }))
                        }
                        setFormDirty(true)
                      }}>
                      <option value="">— Sin periodo —</option>
                      {Object.entries(agruparPeriodos(periodosForm)).map(([anio, items]) => (
                        <optgroup key={anio} label={`Año ${anio}`}>
                          {items.map(p => (
                            <option key={p} value={p}>
                              {formatPeriodoLabel(p)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="__nuevo__">+ Ingresar nuevo…</option>
                    </select>
                    {nuevoPeriodoMode && (
                      <input className="form-control" style={{ marginTop: 6 }} placeholder="YYYY-MM (ej: 2025-06)"
                        value={form.periodo || ''}
                        onChange={e => { setForm(p => ({ ...p, periodo: e.target.value })); setFormDirty(true) }}
                        autoFocus />
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Dependencia / Área</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#2563EB' }}>🏢 Auto-asignada según fecha</span>
                    </label>
                    <select
                      className="form-control"
                      value={form.dependencia || ''}
                      onChange={f('dependencia')}
                      title="Área a la que se cargará la novedad. Se autoasigna según la fecha del evento y los períodos del colaborador."
                    >
                      <option value="">— Sin área asignada —</option>
                      {form.dependencia && !dependencias.includes(form.dependencia) && (
                        <option value={form.dependencia}>{form.dependencia}</option>
                      )}
                      {dependencias.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Se asigna automáticamente con el área del colaborador en la fecha de la novedad. Puedes ajustarla si es necesario.
                    </span>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Diagnóstico (código)</label>
                    <input className="form-control" placeholder="Ej: J06X" value={form.diagnostico || ''} onChange={f('diagnostico')} />
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S3: Fechas */}
              <div style={{ background: 'var(--bg,#F9FAFB)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📅</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: sinFechas ? '#D1D5DB' : '#374151' }}>
                    Fechas {sinFechas && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10, marginLeft: 4 }}>— no aplica para este concepto</span>}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12, opacity: sinFechas ? .35 : 1, pointerEvents: sinFechas ? 'none' : 'auto' }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↘ Inicio</label>
                    <input className="form-control" type="date" value={form.fecha_inicio || ''} onChange={f('fecha_inicio')} disabled={sinFechas}
                      min={modal === 'edit' ? undefined : minFechaForm} max={modal === 'edit' ? undefined : maxFechaForm} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↗ Fin</label>
                    <input className="form-control" type="date" value={form.fecha_fin || ''} onChange={f('fecha_fin')} disabled={sinFechas}
                      min={modal === 'edit' ? undefined : minFechaForm} max={modal === 'edit' ? undefined : maxFechaForm} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                      <span>Días {form.fecha_inicio && form.fecha_fin && !sinFechas && <span style={{ color: 'var(--primary)' }}>●</span>}</span>
                      {(form.jornada === 'Medio día' || Number(form.total_dias) === 0.5) && (
                        <span style={{ fontSize: 10.5, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                          ½ día
                        </span>
                      )}
                    </label>
                    <input className="form-control" type="number" step="0.5" min="0" value={form.total_dias ?? ''} onChange={f('total_dias')}
                      disabled={sinFechas}
                      placeholder={form.jornada === 'Medio día' ? '0.5' : '1'}
                      style={form.fecha_inicio && form.fecha_fin && !sinFechas ? { background: 'var(--bg)', color: 'var(--primary)', fontWeight: 800, textAlign: 'center' } : { textAlign: 'center' }} />
                  </div>
                </div>
                {!sinFechas && modal !== 'edit' && (minFechaForm || maxFechaForm) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Rango permitido para {form.nombre_empleado}: {minFechaForm || '(sin ingreso registrado)'} → {maxFechaForm || 'hoy'}
                  </div>
                )}

                {(form.concepto === 'LNR' || form.concepto === 'LR' || form.concepto === '1/2 LR y 1/2 LNR' || form.concepto === 'Calamidad/Luto' || form.concepto === 'Otros') && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: 0, display: 'block' }}>Jornada</label>
                      {form.jornada === 'Medio día' && (
                        <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                          (Medio día = 0.5 días en nómina y reportes)
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { v: '', label: 'Día completo' },
                        { v: 'Medio día', label: 'Medio día (½ día)' },
                      ].map(op => {
                        const sel = (form.jornada || '') === op.v
                        return (
                          <button key={op.v || 'completo'} type="button"
                            onClick={() => {
                              const esMedio = op.v === 'Medio día'
                              setForm(p => {
                                let nuevosDias = p.total_dias
                                if (esMedio) {
                                  nuevosDias = 0.5
                                } else if (Number(p.total_dias) === 0.5) {
                                  // Recalcular a día completo
                                  if (p.fecha_inicio && p.fecha_fin) {
                                    const ini = new Date(p.fecha_inicio)
                                    const fin = new Date(p.fecha_fin)
                                    nuevosDias = !isNaN(ini) && !isNaN(fin) && fin >= ini
                                      ? Math.round((fin - ini) / (1000 * 60 * 60 * 24)) + 1
                                      : 1
                                  } else {
                                    nuevosDias = 1
                                  }
                                }
                                return {
                                  ...p,
                                  jornada: op.v,
                                  total_dias: nuevosDias,
                                }
                              })
                              setFormDirty(true)
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              border: sel ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                              background: sel ? 'var(--primary-light)' : 'var(--surface)',
                              color: sel ? 'var(--primary)' : 'var(--text-muted)',
                              transition: 'all .15s',
                            }}>
                            {op.v === 'Medio día' ? '🕐 ' : '📆 '}{op.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {form.concepto === 'Vacaciones' && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>
                          💰 Días en dinero (compensados)
                        </label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.dias_en_dinero || ''}
                          onChange={e => {
                            const val = e.target.value
                            setForm(p => {
                              const dDin = val === '' ? 0 : Number(val)
                              const dFis = p.fecha_inicio && p.fecha_fin ? (diasHabilesEntre(p.fecha_inicio, p.fecha_fin, { periodo: p.periodo || p.periodo_vacaciones }) || 0) : 0
                              const tot = (dFis + dDin) > 0 ? (dFis + dDin) : p.total_dias
                              return {
                                ...p,
                                dias_en_dinero: val,
                                total_dias: tot
                              }
                            })
                            setFormDirty(true)
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>
                          Desglose calculado
                        </label>
                        <div style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#0369a1',
                          minHeight: 38,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {(() => {
                            const dDin = Number(form.dias_en_dinero) || 0
                            const dFis = form.fecha_inicio && form.fecha_fin ? (diasHabilesEntre(form.fecha_inicio, form.fecha_fin, { periodo: form.periodo || form.periodo_vacaciones }) || 0) : 0
                            if (dDin > 0 && dFis > 0) {
                              return `🌴 ${dFis}d disfrute + 💰 ${dDin}d dinero`
                            }
                            if (dDin > 0) {
                              return `💰 ${dDin} días en dinero`
                            }
                            if (dFis > 0) {
                              return `🌴 ${dFis} días disfrute físico`
                            }
                            return <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Sin días calculados</span>
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S4: Validaciones */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✅</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Validaciones</span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>— clic en pill para ciclar</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Válid. Incapacidad', field: 'validacion_incapacidad', ops: ['', 'OK', 'Validar', 'N/A'] },
                      { label: 'Prórroga', field: 'prorroga', ops: ['', 'Sí', 'No', 'N/A'] },
                      { label: 'Rad. Incapacidad', field: 'radicacion_incapacidad', ops: ['', 'OK', 'Validar', 'N/A'] },
                    ].map(({ label, field, ops }) => {
                      const esRadicacion = field === 'radicacion_incapacidad'
                      const esIncapacidad = normalizarConcepto(form.concepto) === 'Incapacidad'
                      const diasNum = parseFloat(form.total_dias) || 0

                      return (
                        <div key={field}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            {label}
                            {esRadicacion && esIncapacidad && diasNum > 0 && (
                              <span style={{
                                marginLeft: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                color: diasNum < 3 ? '#059669' : '#2563EB'
                              }}>
                                {diasNum < 3 ? '(<3d Empresa)' : '(≥3d EPS)'}
                              </span>
                            )}
                          </label>
                          <PillBtn field={field} opciones={ops} />
                          {esRadicacion && esIncapacidad && diasNum > 0 && (
                            <div style={{
                              fontSize: 10,
                              lineHeight: 1.25,
                              marginTop: 5,
                              color: diasNum < 3 ? '#059669' : (form.radicacion_incapacidad ? '#059669' : '#D97706'),
                            }}>
                              {diasNum < 3
                                ? '🏢 No requiere EPS (1-2 días)'
                                : (form.radicacion_incapacidad ? '✓ Radicación EPS registrada' : '⚠️ Radicar ante EPS (≥3 días)')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {[
                    { label: 'Obs. Contabilidad', field: 'observacion_contabilidad' },
                    { label: 'Nómina Electrónica', field: 'nomina_electronica' },
                    { label: 'Seguridad Social', field: 'seguridad_social' },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>{label}</label>
                      <OkBtnGroup field={field} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S5: Observación */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💬</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Observación</span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>— opcional</span>
                </div>
                <textarea className="form-control" rows={3}
                  value={form.observacion || ''} onChange={f('observacion')}
                  placeholder="Notas adicionales sobre esta novedad..."
                  style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>

            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid var(--border)', padding: '14px 24px',
              display: 'flex', flexDirection: 'column', gap: 10,
              background: 'var(--surface)', borderRadius: '0 0 12px 12px'
            }}>
              {formError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: 'var(--danger-bg)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger-text)',
                  borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{formError}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {[
                    form.nombre_empleado && '👤 ' + form.nombre_empleado.split(' ')[0],
                    form.concepto && form.concepto,
                    form.periodo && '📅 ' + form.periodo,
                    form.total_dias && '⏱ ' + form.total_dias + 'd',
                  ].filter(Boolean).join(' · ') || 'Completa los campos obligatorios *'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" onClick={save} disabled={saving}
                    style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {saving ? <><span>⏳</span> Guardando...</> : <><span>{modal === 'add' ? '✅' : '💾'}</span>{modal === 'add' ? 'Crear novedad' : 'Guardar cambios'}</>}
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </AnimatedModal>
  )
}
