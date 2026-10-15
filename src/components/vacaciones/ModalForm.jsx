import { useCallback, useEffect } from 'react'
import { X, Calendar, Clock, AlertCircle } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { diasHabilesEntre } from '../../utils/diasHabiles'
import { calcAntiguedad, calcDias, calcularAniosCumplidos, obtenerFechaIngresoContinua, aFechaInputDate } from '../../utils/vacacionesHelpers'
import { ESTADOS, ESTADO_STYLES, DEPENDENCIAS } from '../../utils/vacacionesConstants'
import SearchableSelect from '../ui/SearchableSelect'

const GRAD = {
  'Vacaciones':             'linear-gradient(135deg,#0F6E56 0%,#10B981 100%)',
  'Vacaciones en dinero':   'linear-gradient(135deg,#78350F 0%,#D97706 100%)',
  'Vacaciones compensadas': 'linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)',
}
const ICON = {
  'Vacaciones': '🌴', 'Vacaciones en dinero': '💰', 'Vacaciones compensadas': '📋',
}
const TIPO_COLS = { 'Vacaciones': '#0F6E56', 'Vacaciones en dinero': 'var(--warning-text)', 'Vacaciones compensadas': 'var(--info-text)' }
const TIPO_BGS = { 'Vacaciones': 'var(--success-bg)', 'Vacaciones en dinero': 'var(--warning-bg)', 'Vacaciones compensadas': 'var(--info-bg)' }

export default function ModalForm({
  modal, form, setForm, f, save, saving,
  empleados = [],
  empActivos, empInactivos, diasAcumuladosForm, anioActual,
  saldoVacacionesForm = null,
  periodos = [],
  rows = [],
  onClose,
}) {
  const { departamentos } = useCompany()
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS
  const tipo = form.tipo_vacacion || 'Vacaciones'
  const EST = form.estado || 'Pendiente'
  const estStyle = ESTADO_STYLES[EST] || ESTADO_STYLES['Pendiente']
  const campos = [form.nombre_empleado, form.tipo_vacacion, form.estado]
  const pct = Math.round((campos.filter(Boolean).length / campos.length) * 100)

  // Años de servicio cumplidos para referencia informativa
  const aniosCumplidos = saldoVacacionesForm?.aniosCumplidos != null
    ? saldoVacacionesForm.aniosCumplidos
    : (form.fecha_ingreso ? calcularAniosCumplidos(form.fecha_ingreso) : 0)

  // Cálculo de días solicitados en este formulario
  const diasDisfrute = (form.fecha_inicio && form.fecha_fin)
    ? (diasHabilesEntre(form.fecha_inicio, form.fecha_fin) || 0)
    : (Number(form.dias_disfrutados) || Number(form.total_dias) || 0)
  const diasDinero = (form.tipo_vacacion === 'Vacaciones en dinero')
    ? (Number(form.dias_en_dinero) || 15)
    : (Number(form.dias_en_dinero) || 0)
  const diasSolicitados = (form.tipo_vacacion === 'Vacaciones en dinero')
    ? diasDinero
    : (diasDisfrute + diasDinero)

  const saldoDisponible = saldoVacacionesForm != null
    ? Math.max(0, saldoVacacionesForm.saldoPendiente)
    : 0
  const topeDisponible = saldoVacacionesForm?.topeDisponible != null
    ? Math.max(0, saldoVacacionesForm.topeDisponible)
    : saldoDisponible
  const excedeSaldo = diasSolicitados > 0 && diasSolicitados > topeDisponible
  const sinSaldo = topeDisponible <= 0
  const saldoRestante = Math.max(0, topeDisponible - diasSolicitados)

  // Resolver colaborador y sus datos contractuales (antigüedad, periodo vigente, fecha continua)
  const resolverColaborador = useCallback((val) => {
    if (!val) return null
    const nom = String(val).trim().toLowerCase()
    const todos = (empleados && empleados.length > 0)
      ? empleados
      : [...(empActivos || []), ...(empInactivos || [])]
    const emp = todos.find(e =>
      (typeof e === 'object' ? e.nombre_completo : e)?.trim().toLowerCase() === nom
    )
    if (!emp) return null

    const empObj = typeof emp === 'object' ? emp : null
    const empId = empObj?.id || null
    const periodosEmp = periodos?.filter(p => empId && p.empleado_id === empId) || []
    const pActivo = periodosEmp.find(p => p.es_periodo_actual) || periodosEmp[0] || null
    const fIngRaw = pActivo
      ? (obtenerFechaIngresoContinua(pActivo, periodosEmp) || pActivo.fecha_ingreso)
      : (empObj?.fecha_ingreso || null)
    const fIngreso = fIngRaw ? aFechaInputDate(fIngRaw) : ''

    return {
      emp: empObj,
      pActivo,
      fIngreso,
      cargo: empObj?.cargo || pActivo?.cargo || '',
      dependencia: empObj?.dependencia || pActivo?.dependencia || '',
      periodoId: pActivo?.id || null,
    }
  }, [empleados, empActivos, empInactivos, periodos])

  // Auto-completar datos si el modal abre con nombre_empleado pero sin fecha_ingreso
  useEffect(() => {
    if (!form.nombre_empleado?.trim()) return
    if (form.fecha_ingreso && form.cargo && form.dependencia) return

    const res = resolverColaborador(form.nombre_empleado)
    if (!res) return

    setForm(p => {
      const nextFecha = p.fecha_ingreso || res.fIngreso || ''
      const nextCargo = p.cargo || res.cargo || ''
      const nextDep   = p.dependencia || res.dependencia || ''
      const nextPid   = p.periodo_id || res.periodoId || null
      if (p.fecha_ingreso === nextFecha && p.cargo === nextCargo && p.dependencia === nextDep && p.periodo_id === nextPid) {
        return p
      }
      return {
        ...p,
        cargo: nextCargo,
        dependencia: nextDep,
        fecha_ingreso: nextFecha,
        periodo_id: nextPid,
      }
    })
  }, [form.nombre_empleado, form.fecha_ingreso, form.cargo, form.dependencia, resolverColaborador, setForm])

  const onEmpleadoChange = (val) => {
    const res = resolverColaborador(val)

    let periodoSugerido = ''
    if (res?.fIngreso && modal === 'add') {
      const nom = (val || '').trim().toLowerCase()
      const prevVacs = (rows || []).filter(r =>
        (r.nombre_empleado || '').trim().toLowerCase() === nom &&
        ['Pendiente', 'Aprobada', 'En curso', 'Finalizada'].includes(r.estado || 'Pendiente')
      )
      const cicloNum = prevVacs.length + 1
      const hireYear = new Date(res.fIngreso + 'T00:00:00').getFullYear()
      if (!isNaN(hireYear)) {
        const y1 = hireYear + (cicloNum - 1)
        const y2 = y1 + 1
        periodoSugerido = `${y1}-${y2}`
      }
    }

    setForm(p => ({
      ...p,
      nombre_empleado: val,
      cargo: res?.cargo || p.cargo || '',
      dependencia: res?.dependencia || p.dependencia || '',
      fecha_ingreso: res?.fIngreso || p.fecha_ingreso || '',
      periodo_id: res?.periodoId || p.periodo_id || null,
      periodo_vacaciones: p.periodo_vacaciones || periodoSugerido || p.periodo_vacaciones,
    }))
  }

  const onTipoChange = (tipoVal) => {
    if (tipoVal === 'Vacaciones en dinero') {
      const tope = topeDisponible != null ? topeDisponible : 15
      const dineroDefault = String(Math.max(0, Math.min(15, tope)))
      setForm(p => ({
        ...p,
        tipo_vacacion: tipoVal,
        fecha_inicio: '',
        fecha_fin: '',
        total_dias: '',
        dias_en_dinero: p.dias_en_dinero || dineroDefault,
      }))
    } else {
      setForm(p => ({ ...p, tipo_vacacion: tipoVal }))
    }
  }

  const onFechaInicioChange = (e) => {
    const fIni = e.target.value
    const fFin = form.fecha_fin
    const dias = (fIni && fFin) ? calcDias(fIni, fFin) : form.total_dias
    let dinero = form.dias_en_dinero
    if (modal === 'add' && fIni && fFin && (form.tipo_vacacion || 'Vacaciones') !== 'Vacaciones en dinero') {
      const habiles = diasHabilesEntre(fIni, fFin) || 0
      const tope = topeDisponible != null ? topeDisponible : 15
      const disponibleParaDinero = Math.max(0, tope - habiles)
      dinero = String(Math.min(Math.max(0, 15 - habiles), disponibleParaDinero))
    }
    setForm(p => ({
      ...p,
      fecha_inicio: fIni,
      total_dias: (fIni && fFin && dias !== '') ? String(dias) : p.total_dias,
      dias_en_dinero: dinero,
    }))
  }

  const onFechaFinChange = (e) => {
    const fFin = e.target.value
    const fIni = form.fecha_inicio
    const dias = (fIni && fFin) ? calcDias(fIni, fFin) : form.total_dias
    let dinero = form.dias_en_dinero
    if (modal === 'add' && fIni && fFin && (form.tipo_vacacion || 'Vacaciones') !== 'Vacaciones en dinero') {
      const habiles = diasHabilesEntre(fIni, fFin) || 0
      const tope = topeDisponible != null ? topeDisponible : 15
      const disponibleParaDinero = Math.max(0, tope - habiles)
      dinero = String(Math.min(Math.max(0, 15 - habiles), disponibleParaDinero))
    }
    setForm(p => ({
      ...p,
      fecha_fin: fFin,
      total_dias: (fIni && fFin && dias !== '') ? String(dias) : p.total_dias,
      dias_en_dinero: dinero,
    }))
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ animation: 'fadeIn .2s ease' }}>
      <div className="modal" style={{ maxWidth: 600, padding: 0, overflow: 'hidden', borderRadius: 16, animation: 'fadeInUp .25s ease' }}>

        {/* ── Cabecera dinámica por tipo ── */}
        <div style={{ background: GRAD[tipo] || GRAD['Vacaciones'], padding: '22px 24px 16px', transition: 'background .4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Ícono */}
            <div style={{
              width: 58, height: 58, borderRadius: 14, flexShrink: 0, fontSize: 30,
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)', transition: 'all .3s ease',
            }}>{ICON[tipo] || '🌴'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                {modal === 'add' ? 'Nueva solicitud · Vacaciones' : 'Editando solicitud'}
              </div>
              <h2 style={{ color: '#fff', margin: '0 0 5px', fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.nombre_empleado || 'Selecciona un empleado'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                  {tipo}
                </span>
                <span style={{ ...estStyle, padding: '2px 9px', fontSize: 11, borderRadius: 999 }}>
                  {EST}
                </span>
                {form.fecha_inicio && form.fecha_fin && (
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                    📅 {form.fecha_inicio} → {form.fecha_fin}
                  </span>
                )}
                {form.total_dias && (
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>⏱ {form.total_dias} día{Number(form.total_dias) !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn"
              style={{
                border: 'none', borderRadius: 10,
                color: '#fff', cursor: 'pointer', padding: '8px 10px', display: 'flex',
                alignItems: 'center', flexShrink: 0, transition: 'background .15s'
              }}>
              <X size={16} />
            </button>
          </div>
          {/* Barra progreso */}
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

        {/* ── Cuerpo ── */}
        <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '62vh', overflowY: 'auto' }}>

          {/* S1: Empleado */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Empleado *</span>
            </div>
            <SearchableSelect
              value={form.nombre_empleado}
              onChange={onEmpleadoChange}
              activos={empActivos} inactivos={empInactivos}
              placeholder="— Seleccionar empleado —"
            />
            {form.nombre_empleado?.trim() && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  title={saldoVacacionesForm ? `Años cumplidos: ${aniosCumplidos} | Causados: ${saldoVacacionesForm.diasCausados} días${saldoVacacionesForm.diasManuales ? ` | Tomados históricos: ${saldoVacacionesForm.diasManuales} días` : ''} | Tomados en app: ${saldoVacacionesForm.diasDisfrutados + saldoVacacionesForm.diasEnDinero} días` : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: (saldoDisponible > 0) ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: (saldoDisponible > 0) ? 'var(--success-text)' : 'var(--danger-text)',
                    border: `1px solid ${saldoDisponible > 0 ? 'color-mix(in srgb, var(--success) 35%, transparent)' : 'color-mix(in srgb, var(--danger) 35%, transparent)'}`,
                    borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700
                  }}>
                  🌴 Días disponibles: {saldoDisponible} días
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                  <Calendar size={11} /> Días hábiles {anioActual}: {diasAcumuladosForm}
                </span>
                {form.fecha_ingreso && calcAntiguedad(form.fecha_ingreso) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--info-bg)', color: 'var(--info-text)', border: '1px solid color-mix(in srgb, var(--info) 30%, transparent)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                    <Clock size={11} /> Antigüedad: {calcAntiguedad(form.fecha_ingreso)?.texto}
                  </span>
                )}

                {sinSaldo && (
                  <div style={{
                    width: '100%', marginTop: 4,
                    background: 'var(--danger-bg)',
                    border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
                    color: 'var(--danger-text)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>
                      Este colaborador no tiene días de vacaciones disponibles en su contrato vigente (Saldo disponible: {saldoDisponible} días).
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* S2: Tipo, Estado, Área, Período */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📋</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Tipo y estado</span>
            </div>

            {/* Tipo: tarjetas */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Tipo de vacación</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { val: 'Vacaciones', icon: '🌴', desc: 'Disfrute de días' },
                  { val: 'Vacaciones en dinero', icon: '💰', desc: '15 días en dinero' },
                  { val: 'Vacaciones compensadas', icon: '📋', desc: 'Compensación' },
                ].map(opt => {
                  const sel = (form.tipo_vacacion || 'Vacaciones') === opt.val
                  const col = TIPO_COLS[opt.val], bg = TIPO_BGS[opt.val]
                  return (
                    <button key={opt.val} type="button"
                      onClick={() => onTipoChange(opt.val)}
                      style={{
                        padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                        border: sel ? `2px solid ${col}` : '2px solid var(--border)',
                        background: sel ? bg : 'var(--surface)',
                        transition: 'all .2s',
                        boxShadow: sel ? `0 0 0 3px color-mix(in srgb, ${col} 14%, transparent), 0 2px 8px color-mix(in srgb, ${col} 10%, transparent)` : '0 1px 2px rgba(0,0,0,.05)',
                        transform: sel ? 'translateY(-1px)' : 'none',
                      }}
                      onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = col; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                      onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' } }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: sel ? col : 'var(--text)', lineHeight: 1.3 }}>{opt.val}</div>
                      <div style={{ fontSize: 10, color: sel ? col : 'var(--text-muted)', marginTop: 2, opacity: .8 }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Estado: pills */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Estado</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {ESTADOS.map(s => {
                  const sel = (form.estado || 'Pendiente') === s
                  const st = ESTADO_STYLES[s]
                  return (
                    <button key={s} type="button"
                      onClick={() => setForm(p => ({ ...p, estado: s }))}
                      style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: sel ? `2px solid ${st.border}` : '1.5px solid var(--border)',
                        background: sel ? st.bg : 'var(--surface)',
                        color: sel ? st.color : 'var(--text-muted)',
                        transition: 'all .15s',
                        boxShadow: sel ? `0 0 0 2px ${st.border}` : 'none',
                      }}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Área / Dependencia</label>
                <select className="form-control" value={form.dependencia || ''} onChange={f('dependencia')}>
                  <option value="">— Seleccionar —</option>
                  {listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Cargo</label>
                <input className="form-control" value={form.cargo || ''} onChange={f('cargo')} placeholder="Cargo del colaborador" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Período de vacaciones</label>
                <input className="form-control" value={form.periodo_vacaciones || ''} onChange={f('periodo_vacaciones')} placeholder="Ej: 2024-2025" />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* S3: Fechas y días */}
          <div style={{
            background: excedeSaldo ? 'color-mix(in srgb, var(--danger-bg) 35%, var(--bg,#F9FAFB))' : 'var(--bg,#F9FAFB)',
            borderRadius: 10, padding: '14px 16px',
            border: excedeSaldo ? '1.5px solid var(--danger)' : '1px solid var(--border)',
            transition: 'all .2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📅</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: (form.tipo_vacacion || 'Vacaciones') === 'Vacaciones en dinero' ? 'var(--text-muted)' : 'var(--text)' }}>
                Fechas y días {(form.tipo_vacacion || 'Vacaciones') === 'Vacaciones en dinero' && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10, marginLeft: 4 }}>— no aplica para vacaciones en dinero</span>}
              </span>
            </div>

            {(form.tipo_vacacion || 'Vacaciones') === 'Vacaciones en dinero' ? (
              <div style={{
                background: excedeSaldo ? 'var(--danger-bg)' : 'var(--warning-bg)',
                border: `1px solid ${excedeSaldo ? 'color-mix(in srgb, var(--danger) 40%, transparent)' : 'color-mix(in srgb, var(--warning) 40%, transparent)'}`,
                borderRadius: 8, padding: '10px 14px', fontSize: 13,
                color: excedeSaldo ? 'var(--danger-text)' : 'var(--warning-text)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>No requiere fechas. Días en dinero a compensar: <strong>{form.dias_en_dinero || 15} días</strong>.</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↘ Inicio</label>
                  <input className="form-control" type="date" value={form.fecha_inicio || ''} onChange={onFechaInicioChange} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↗ Fin</label>
                  <input className="form-control" type="date" min={form.fecha_inicio || undefined} value={form.fecha_fin || ''} onChange={onFechaFinChange} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block', whiteSpace: 'nowrap' }}>
                    Días {form.fecha_inicio && form.fecha_fin && <span style={{ color: 'var(--primary)' }}>●</span>}
                  </label>
                  <input className="form-control" type="number" min="0"
                    value={form.total_dias || ''} onChange={f('total_dias')}
                    placeholder="Auto"
                    style={form.fecha_inicio && form.fecha_fin ? { background: 'var(--bg)', color: 'var(--primary)', fontWeight: 800, textAlign: 'center' } : { textAlign: 'center' }} />
                </div>
              </div>
            )}

            {/* Días solicitados e info de saldo restante */}
            {diasSolicitados > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 700 }}>
                  ⏱ {diasSolicitados} día{diasSolicitados !== 1 ? 's' : ''} solicitado{diasSolicitados !== 1 ? 's' : ''}
                  {diasDinero > 0 && ` (${diasDisfrute} disfrute + ${diasDinero} dinero)`}
                </span>
                {saldoDisponible != null && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: excedeSaldo ? 'var(--danger-bg)' : 'var(--success-bg)',
                    color: excedeSaldo ? 'var(--danger-text)' : 'var(--success-text)',
                    border: `1px solid ${excedeSaldo ? 'color-mix(in srgb, var(--danger) 35%, transparent)' : 'color-mix(in srgb, var(--success) 35%, transparent)'}`,
                    borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 700
                  }}>
                    {excedeSaldo ? '⚠️' : '✓'} Saldo restante: {saldoRestante} días
                  </span>
                )}
              </div>
            )}

            {/* Alerta de bloqueo si se excede el saldo */}
            {excedeSaldo && (
              <div style={{
                marginTop: 10,
                background: 'var(--danger-bg)',
                border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
                color: 'var(--danger-text)',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                  No puedes solicitar más de los <strong>{topeDisponible} días</strong> disponibles. Estás solicitando <strong>{diasSolicitados} días</strong> (exceso de {diasSolicitados - topeDisponible} días).
                </span>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* S4: Datos adicionales */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📊</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Datos adicionales</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>
                  Días en dinero
                  <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 4, color: 'var(--text-muted)' }}>
                    {(form.tipo_vacacion || 'Vacaciones') === 'Vacaciones en dinero' ? '(a compensar)' : '(compensación)'}
                  </span>
                </label>
                <input className="form-control" type="number" min="0"
                  max={topeDisponible != null ? topeDisponible : undefined}
                  value={form.dias_en_dinero || ''} onChange={f('dias_en_dinero')}
                  placeholder="0"
                  style={form.dias_en_dinero ? { background: '#FEF9C3', color: '#78350F', fontWeight: 700, textAlign: 'center' } : { fontWeight: 700, textAlign: 'center' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>
                  Fecha de ingreso <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>(Solo lectura)</span>
                </label>
                <input
                  className="form-control"
                  type="date"
                  value={aFechaInputDate(form.fecha_ingreso)}
                  readOnly
                  disabled
                  style={{ background: 'var(--bg, #f3f4f6)', cursor: 'not-allowed', color: 'var(--text)', opacity: 0.9 }}
                  title="Fecha de ingreso contractual vigente del colaborador (bloqueada)"
                />
                {form.fecha_ingreso && calcAntiguedad(form.fecha_ingreso) && (
                  <div style={{ fontSize: 10, color: '#7C3AED', marginTop: 4, fontWeight: 600 }}>
                    ⏱ {calcAntiguedad(form.fecha_ingreso)?.texto}
                  </div>
                )}
                {!form.fecha_ingreso && form.nombre_empleado && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    Sin fecha de ingreso registrada en el perfil
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Aprobado por</label>
                <input className="form-control" value={form.aprobado_por || ''} onChange={f('aprobado_por')} placeholder="Nombre del aprobador" />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* S5: Observaciones */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💬</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Observaciones</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Área contable</label>
                <textarea className="form-control" rows={2} value={form.observacion_contable || ''} onChange={f('observacion_contable')}
                  placeholder="Ej: 8 días compensados en dinero..." style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          background: 'var(--surface)', borderRadius: '0 0 16px 16px'
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {[
              form.nombre_empleado && '👤 ' + form.nombre_empleado.split(' ')[0],
              form.tipo_vacacion && form.tipo_vacacion,
              form.estado && form.estado,
              form.total_dias && '⏱ ' + form.total_dias + ' días',
            ].filter(Boolean).join(' · ') || 'Completa los campos obligatorios *'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}
              disabled={saving || excedeSaldo || (sinSaldo && diasSolicitados > 0)}
              title={
                excedeSaldo
                  ? `No puedes guardar: la solicitud supera los ${topeDisponible} días disponibles`
                  : undefined
              }
              style={{
                minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: (excedeSaldo || (sinSaldo && diasSolicitados > 0)) ? 0.5 : 1,
                cursor: (excedeSaldo || (sinSaldo && diasSolicitados > 0)) ? 'not-allowed' : 'pointer'
              }}>
              {saving
                ? <><span>⏳</span> Guardando...</>
                : <><span>{modal === 'add' ? '🌴' : '💾'}</span> {modal === 'add' ? 'Crear solicitud' : 'Guardar cambios'}</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
