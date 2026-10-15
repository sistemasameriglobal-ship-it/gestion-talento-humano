// =============================================================
// src/components/procesos-disciplinarios/PdFormModal.jsx
// -------------------------------------------------------------
// Modal de alta/edición de proceso disciplinario (extraído de
// ProcesosDisciplinarios.jsx).
// =============================================================
import { X, AlertTriangle, Paperclip, FileText, Upload, Eye } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import AnimatedModal from '../ui/AnimatedModal'
import SearchableSelect from '../ui/SearchableSelect'
import { CONCEPTOS, DEPARTAMENTOS, MAX_ADJUNTO_MB, UMBRAL_ALERTA, ALERT, formatTamano } from '../../utils/procesosDisciplinariosConstants'
import './procesos-disciplinarios.css'

export default function PdFormModal({
  modal, form, f, setForm, setFormDirty, conteoEmpleadoForm, conceptoActual,
  saving, save, closeModal, empleados, subirAdjuntos, quitarAdjunto, verAdjunto,
  signedUrlLoading, uploadingAdjunto, adjuntoInputKey,
}) {
  const { departamentos } = useCompany()
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPARTAMENTOS
  const color = conceptoActual.color || '#374151'

  return (
    <AnimatedModal open={!!modal} onRequestClose={closeModal} maxWidth={560}>
      {modal && (() => {
        const campos = [form.nombre_empleado, form.concepto, form.departamento]
        const pct = Math.round((campos.filter(Boolean).length / campos.length) * 100)

        return (
          <>
            {/* Cabecera dinámica */}
            <div style={{
              background: `linear-gradient(135deg,${color}cc 0%,${color}88 100%)`,
              padding: '22px 24px 16px', borderRadius: '12px 12px 0 0', transition: 'background .4s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                }}>
                  {conceptoActual.icon || '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                    {modal === 'add' ? 'Nuevo proceso disciplinario' : 'Editando proceso disciplinario'}
                  </div>
                  <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.nombre_empleado || 'Selecciona un empleado'}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      {form.concepto}
                    </span>
                    {form.departamento && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>🏢 {form.departamento}</span>}
                    {conteoEmpleadoForm >= UMBRAL_ALERTA && (
                      <span style={{ color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={11} /> reincidente
                      </span>
                    )}
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
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 24px' }}>

              {/* S1: Empleado */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Empleado</span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>— obligatorio</span>
                </div>
                <SearchableSelect
                  value={form.nombre_empleado}
                  onChange={nombre => {
                    setFormDirty(true)
                    const depAuto = empleados.mapa?.[nombre] || ''
                    setForm(p => ({
                      ...p,
                      nombre_empleado: nombre,
                      departamento: depAuto || p.departamento,
                    }))
                  }}
                  activos={empleados.activos}
                  inactivos={empleados.inactivos}
                  placeholder="— Seleccionar empleado —"
                />
                {conteoEmpleadoForm > 0 && (
                  <p style={{
                    marginTop: 8, fontSize: 12, fontWeight: 600,
                    color: conteoEmpleadoForm >= UMBRAL_ALERTA ? ALERT.text : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {conteoEmpleadoForm >= UMBRAL_ALERTA && <AlertTriangle size={13} />}
                    Este empleado ya tiene {conteoEmpleadoForm} proceso{conteoEmpleadoForm !== 1 ? 's' : ''} disciplinario{conteoEmpleadoForm !== 1 ? 's' : ''} registrado{conteoEmpleadoForm !== 1 ? 's' : ''}.
                    {conteoEmpleadoForm + 1 >= UMBRAL_ALERTA && ' Con este nuevo registro alcanzará el umbral de alerta.'}
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S2: Concepto y departamento */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📋</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Concepto</span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>— obligatorio</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {CONCEPTOS.map(c => {
                    const sel = form.concepto === c.id
                    return (
                      <button key={c.id} type="button"
                        onClick={() => { setFormDirty(true); setForm(p => ({ ...p, concepto: c.id })) }}
                        style={{
                          padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                          border: sel ? `2px solid ${c.color}` : '1.5px solid var(--border)',
                          background: sel ? c.color + '18' : 'var(--surface)',
                          color: sel ? c.color : 'var(--text-muted)',
                          transition: 'all .15s',
                          boxShadow: sel ? `0 0 0 2px ${c.color}33` : 'none',
                          transform: sel ? 'translateY(-1px)' : 'none',
                        }}>
                        {c.icon} {c.id}
                      </button>
                    )
                  })}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Departamento</label>
                  <select className="form-control" value={form.departamento || ''} onChange={f('departamento')}>
                    <option value="">— Seleccionar área —</option>
                    {listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S3: Fechas */}
              <div style={{ background: 'var(--bg,#F9FAFB)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📅</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>
                    {conceptoActual.rango ? 'Fecha inicio y fin' : 'Fecha'}
                  </span>
                </div>
                {conceptoActual.rango ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↘ Inicio</label>
                      <input className="form-control" type="date" value={form.fecha_inicio || ''} onChange={f('fecha_inicio')} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>↗ Fin</label>
                      <input className="form-control" type="date" value={form.fecha_fin || ''} onChange={f('fecha_fin')} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Fecha</label>
                      <input className="form-control" type="date" value={form.fecha || ''} onChange={f('fecha')} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Hora</label>
                      <input className="form-control" type="time" value={form.hora || ''} onChange={f('hora')} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* S4: Observación */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💬</div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Observación</span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>— opcional</span>
                </div>
                <textarea className="form-control" rows={3} value={form.observacion || ''} onChange={f('observacion')}
                  placeholder="Detalle del proceso disciplinario..."
                  style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {/* S5: Adjuntos PDF */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                    <Paperclip size={13} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151' }}>Adjuntos (PDF)</span>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>— opcional</span>
                </div>

                {form.archivos && form.archivos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {form.archivos.map((a, idx) => (
                      <div key={a.path || idx} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12.5,
                      }}>
                        <FileText size={15} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nombre}>
                          {a.nombre}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>{formatTamano(a.tamano)}</span>
                        <button type="button" className="btn btn-ghost btn-sm" title="Ver PDF" disabled={signedUrlLoading === a.path}
                          onClick={() => verAdjunto(a)}>
                          {signedUrlLoading === a.path ? '⏳' : <Eye size={13} />}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" title="Quitar" onClick={() => quitarAdjunto(idx)}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: uploadingAdjunto ? 'wait' : 'pointer', margin: 0 }}>
                  <Upload size={14} /> {uploadingAdjunto ? 'Subiendo…' : 'Adjuntar PDF'}
                  <input
                    key={adjuntoInputKey}
                    type="file"
                    accept="application/pdf"
                    multiple
                    disabled={uploadingAdjunto}
                    onChange={(e) => subirAdjuntos(e.target.files)}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: 10.5, color: '#6B7280', marginLeft: 8 }}>Máximo {MAX_ADJUNTO_MB}MB por archivo, solo PDF.</span>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid var(--border)', padding: '14px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              background: 'var(--surface)', borderRadius: '0 0 12px 12px'
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {[
                  form.nombre_empleado && '👤 ' + form.nombre_empleado.split(' ')[0],
                  form.concepto && conceptoActual.icon + ' ' + form.concepto,
                  form.departamento && '🏢 ' + form.departamento,
                ].filter(Boolean).join(' · ') || 'Completa los campos obligatorios *'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}
                  style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {saving ? <><span>⏳</span> Guardando...</> : <><span>{modal === 'add' ? '✅' : '💾'}</span>{modal === 'add' ? 'Crear proceso' : 'Guardar cambios'}</>}
                </button>
              </div>
            </div>
          </>
        )
      })()}
    </AnimatedModal>
  )
}