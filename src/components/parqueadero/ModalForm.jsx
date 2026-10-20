import { X } from 'lucide-react'
import { MESES } from '../../utils/parqueaderoConstants'
import SearchableSelect from '../ui/SearchableSelect'

export default function ModalForm({
  modal, form, setForm, f, save, saving, dupWarn,
  empleados, listaEmpleados = [], aniosDisponibles, mesActual, anioActual,
  onClose,
}) {
  const handleEmpleadoChange = (val) => {
    if (!val) {
      setForm(p => ({
        ...p,
        nombre_empleado: '',
        empleado_id: null,
      }))
      return
    }

    const catalogo = (listaEmpleados && listaEmpleados.length > 0)
      ? listaEmpleados
      : (empleados?.lista || [])

    const emp = catalogo.find(e =>
      e.id === val ||
      (e.nombre_completo && val && e.nombre_completo.trim().toLowerCase() === val.trim().toLowerCase())
    )

    if (emp) {
      const doc = emp.numero_documento || emp.cedula || emp.documento || ''
      const cel = emp.celular || emp.telefono || ''

      setForm(p => ({
        ...p,
        nombre_empleado: emp.nombre_completo || val,
        empleado_id: emp.id || p.empleado_id || null,
        cedula: doc || (p.nombre_empleado ? '' : p.cedula),
        telefono: cel || (p.nombre_empleado ? '' : p.telefono),
      }))
    } else {
      setForm(p => ({
        ...p,
        nombre_empleado: val,
      }))
    }
  }
  return (
    <div className="modal-backdrop" tabIndex={-1}
      style={{ animation: 'fadeIn .2s ease' }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, padding: 0, overflow: 'hidden', animation: 'fadeInUp .25s ease', borderRadius: 16 }}>

        {/* ── Cabecera con preview vivo ── */}
        <div style={{
          background: form.tipo === 'MOTO'
            ? 'linear-gradient(135deg,#78350F 0%,#D97706 100%)'
            : 'linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)',
          padding: '22px 24px 18px', transition: 'background .4s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Ícono vehículo animado */}
            <div style={{
              width: 62, height: 62, borderRadius: 16, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, transition: 'all .3s ease',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
              {form.tipo === 'MOTO' ? '🏍' : form.tipo === 'CARRO' ? '🚗' : modal === 'add' ? '🅿️' : '✏️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                {modal === 'add' ? 'Nuevo registro · Parqueadero' : 'Editando registro'}
              </div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.nombre_empleado || (modal === 'add' ? 'Nombre del empleado' : 'Editar vehículo')}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                {form.placa ? (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                    padding: '2px 10px', borderRadius: 999, fontSize: 13,
                    fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.12em',
                  }}>{form.placa}</span>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Sin placa</span>
                )}
                {form.mes && form.anio && (
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                    📅 {form.mes} {form.anio}
                  </span>
                )}
                {form.observacion === 'EXENTOS DE PAGO' && (
                  <span style={{ background: 'rgba(134,239,172,0.3)', color: 'var(--success-bg)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>✓ Exento</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn"
              style={{
                border: 'none', borderRadius: 10,
                color: '#fff', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center',
                flexShrink: 0, transition: 'background .15s'
              }}>
              <X size={16} />
            </button>
          </div>

          {/* Barra progreso campos completados */}
          {(() => {
            const campos = [form.nombre_empleado, form.placa, form.tipo, form.mes, form.anio]
            const completados = campos.filter(Boolean).length
            const pct = Math.round((completados / campos.length) * 100)
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>COMPLETADO</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'rgba(255,255,255,0.85)', width: `${pct}%`, transition: 'width .3s ease' }} />
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Cuerpo del formulario ── */}
        <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '62vh', overflowY: 'auto' }}>

          {/* Alerta duplicado */}
          {dupWarn && (
            <div style={{ background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeInUp .2s ease' }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span>Este empleado ya tiene un registro en <strong>{form.mes} {form.anio}</strong>.</span>
            </div>
          )}

          {/* ── Sección 1: Empleado ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Datos del empleado</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Nombre completo *</label>
                <SearchableSelect
                  value={form.nombre_empleado}
                  onChange={handleEmpleadoChange}
                  activos={empleados.activos} inactivos={empleados.inactivos}
                  placeholder="— Seleccionar empleado —"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Cédula</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' }}>🪪</span>
                    <input className="form-control" value={form.cedula} onChange={f('cedula')} placeholder="N° de cédula" style={{ paddingLeft: 30 }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Teléfono</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' }}>📱</span>
                    <input className="form-control" value={form.telefono} onChange={f('telefono')} placeholder="N° de contacto" style={{ paddingLeft: 30 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '0 -4px' }} />

          {/* ── Sección 2: Vehículo ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🚘</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Vehículo</span>
            </div>

            {/* Selector tipo: tarjetas grandes */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Tipo de vehículo *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { val: 'CARRO', icon: '🚗', label: 'Carro', desc: 'Automóvil / Camioneta', color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD', grad: 'linear-gradient(135deg,#1E40AF,#3B82F6)' },
                  { val: 'MOTO', icon: '🏍', label: 'Moto', desc: 'Motocicleta / Scooter', color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', grad: 'linear-gradient(135deg,#92400E,#D97706)' },
                ].map(opt => {
                  const sel = form.tipo === opt.val
                  return (
                    <button key={opt.val} type="button"
                      onClick={() => setForm(p => ({ ...p, tipo: opt.val }))}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                        border: sel ? `2px solid ${opt.color}` : '2px solid var(--border)',
                        background: sel ? opt.bg : 'var(--surface)',
                        transition: 'all .2s ease',
                        boxShadow: sel ? `0 0 0 3px color-mix(in srgb, ${opt.color} 14%, transparent), 0 4px 12px color-mix(in srgb, ${opt.color} 10%, transparent)` : '0 1px 3px rgba(0,0,0,.06)',
                        transform: sel ? 'translateY(-1px)' : 'none',
                      }}
                      onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = opt.border; e.currentTarget.style.background = opt.bg; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                      onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = 'none' } }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: sel ? opt.color : 'var(--text)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: sel ? opt.color : 'var(--text-muted)', marginTop: 1, opacity: .8 }}>{opt.desc}</div>
                      {sel && (
                        <div style={{
                          marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: opt.grad, color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700
                        }}>
                          ✓ Seleccionado
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Placa *</label>
                <input className="form-control" value={form.placa} onChange={f('placa')}
                  placeholder="Ej: ABC123"
                  style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Observación</label>
                <select className="form-control" value={form.observacion} onChange={f('observacion')}>
                  <option value="">— Sin observación —</option>
                  <option value="EXENTOS DE PAGO">✅ EXENTOS DE PAGO</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Observación del vehículo</label>
              <textarea className="form-control" rows={2} value={form.nota_vehiculo || ''} onChange={f('nota_vehiculo')}
                placeholder="Notas sobre el vehículo (rayones, estado, particularidades...)" style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '0 -4px' }} />

          {/* ── Sección 3: Período ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📅</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Período</span>
            </div>

            {/* Año: pills */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Año</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {aniosDisponibles.map(a => {
                  const sel = form.anio === a
                  return (
                    <button key={a} type="button" onClick={() => setForm(p => ({ ...p, anio: a }))}
                      style={{
                        padding: '6px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        border: sel ? '2px solid #2563EB' : '2px solid var(--border)',
                        background: sel ? '#2563EB' : 'var(--surface)',
                        color: sel ? '#fff' : 'var(--text)',
                        transition: 'all .15s',
                        boxShadow: sel ? '0 2px 8px #2563EB44' : 'none',
                      }}>
                      {a}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mes: grid 4x3 */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Mes</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {MESES.map((m) => {
                  const sel = form.mes === m
                  const esActual = m === mesActual && form.anio === anioActual
                  return (
                    <button key={m} type="button" onClick={() => setForm(p => ({ ...p, mes: m }))}
                      style={{
                        padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: sel ? 700 : 500, cursor: 'pointer',
                        border: sel ? '2px solid #2563EB' : esActual ? '2px solid color-mix(in srgb, var(--info) 35%, transparent)' : '1.5px solid var(--border)',
                        background: sel ? '#2563EB' : esActual ? 'var(--info-bg)' : 'var(--surface)',
                        color: sel ? '#fff' : esActual ? 'var(--info-text)' : 'var(--text)',
                        transition: 'all .15s',
                        boxShadow: sel ? '0 2px 8px #2563EB44' : 'none',
                        position: 'relative',
                      }}>
                      {m.slice(0, 3)}
                      {esActual && !sel && (
                        <span style={{
                          position: 'absolute', top: 2, right: 3,
                          width: 5, height: 5, borderRadius: '50%', background: '#2563EB',
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Sección 4: Fechas opcionales ── */}
          <div style={{ background: 'var(--bg,#F9FAFB)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🗓</div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Fechas</span>
              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 400 }}>— opcionales</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↘ Ingreso</label>
                <input className="form-control" type="date" value={form.fecha_ingreso || ''} onChange={f('fecha_ingreso')} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↗ Retiro</label>
                <input className="form-control" type="date" value={form.fecha_retiro || ''} onChange={f('fecha_retiro')} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={!!form.retirado}
                onChange={e => setForm(p => ({ ...p, retirado: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#DC2626', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.retirado ? 'var(--danger-text)' : 'var(--text)' }}>
                Esta persona ya se retiró
              </span>
            </label>
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
            {[form.nombre_empleado && '👤 ' + form.nombre_empleado.split(' ')[0],
            form.tipo && (form.tipo === 'CARRO' ? '🚗' : '🏍') + ' ' + form.tipo,
            form.placa && form.placa,
            form.mes && form.anio && form.mes.slice(0, 3) + ' ' + form.anio,
            ].filter(Boolean).join(' · ') || 'Completa los campos obligatorios *'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}
              style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving
                ? <><span style={{ fontSize: 14 }}>⏳</span> Guardando...</>
                : <><span style={{ fontSize: 14 }}>{modal === 'add' ? '✅' : '💾'}</span> {modal === 'add' ? 'Crear registro' : 'Guardar cambios'}</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
