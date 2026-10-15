// =============================================================
// src/components/empleados/EmpleadoFormModal.jsx
// -------------------------------------------------------------
// Modal de alta/edición de empleado (extraído de Empleados.jsx).
// Recibe el estado del formulario y los callbacks desde la página.
// =============================================================
import { User, Mail, Building2, X, Briefcase, Calendar, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { DEPENDENCIAS, DEP_ICONS, DEP_COLORS } from './empleadosConstants'
import { hoyISO } from '../../utils/fecha'
import './empleados.css'

export default function EmpleadoFormModal({
  modal, form, setForm, f, onNombreChange, duplicadoWarning, saving, save, msg, onClose,
}) {
  const { departamentos } = useCompany()
  const listaDepartamentos = departamentos && departamentos.length > 0 ? departamentos : DEPENDENCIAS
  // ── Datos derivados para el header dinámico ─────────────────────────
  const dep = form.dependencia || ''
  const depIcon = DEP_ICONS[dep] || '🏢'
  const iniciales = form.nombre_completo
    ? form.nombre_completo.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
    : '?'
  const gradStart = 'var(--primary)'
  const gradEnd = 'var(--secondary)'

  // Progreso basado en campos claves
  const camposOblig = [form.nombre_completo, form.dependencia, form.cargo]
  const pct = Math.round((camposOblig.filter(Boolean).length / camposOblig.length) * 100)

  return (
    <div className="modal-backdrop emp-modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal emp-modal-box" style={{ maxWidth: 520 }}>

        {/* ── Header dinámico ── */}
        <div style={{
          background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
          padding: '22px 24px 18px',
          borderRadius: '12px 12px 0 0',
          transition: 'background .4s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar con iniciales */}
            <div style={{
              width: 54, height: 54, borderRadius: 14, flexShrink: 0,
              background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: iniciales === '?' ? 22 : 20, fontWeight: 800,
              color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.18)',
              letterSpacing: '-0.02em',
              border: '2px solid rgba(255,255,255,.25)',
            }}>
              {iniciales === '?' ? <User size={24} strokeWidth={2} /> : iniciales}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                {modal === 'add' ? 'Nuevo colaborador' : 'Editando perfil'}
              </div>
              <h2 style={{ color: '#fff', margin: '0 0 6px', fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.nombre_completo || 'Nombre del empleado'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {dep && (
                  <span style={{ background: 'rgba(255,255,255,.2)', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {depIcon} {dep}
                  </span>
                )}
                {form.cargo && (
                  <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>
                    · {form.cargo}
                  </span>
                )}
                {form.fecha_ingreso && (
                  <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>
                    📅 Ingresó {form.fecha_ingreso}
                  </span>
                )}
                {!form.activo && form.fecha_retiro && (
                  <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>
                    🔴 Retiro {form.fecha_retiro}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="modal-close-btn"
              style={{ border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'background .15s' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Barra de progreso */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>COMPLETADO</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,.15)', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'rgba(255,255,255,.85)', width: `${pct}%`, transition: 'width .3s ease' }} />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="modal-body" style={{ maxHeight: '62vh', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Alerta duplicado */}
          {duplicadoWarning && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 14px', borderRadius: 10, marginBottom: 18,
              background: duplicadoWarning.tipo === 'exacto' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              border: `1.5px solid ${duplicadoWarning.tipo === 'exacto' ? 'color-mix(in srgb, var(--danger) 35%, transparent)' : 'color-mix(in srgb, var(--warning) 40%, transparent)'}`,
            }}>
              {duplicadoWarning.tipo === 'exacto'
                ? <AlertCircle size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                : <AlertTriangle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ fontSize: 13, color: duplicadoWarning.tipo === 'exacto' ? 'var(--danger-text)' : 'var(--warning-text)' }}>
                {duplicadoWarning.tipo === 'exacto'
                  ? (duplicadoWarning.empleado?.activo === false
                    ? <><strong>Colaborador inactivo encontrado:</strong> Ya existe "{duplicadoWarning.nombre}" como inactivo. Puedes usar la opción <strong>Reintegrar</strong> en la lista para iniciar su nuevo contrato manteniendo su historial protegido.</>
                    : <><strong>Empleado duplicado:</strong> Ya existe "{duplicadoWarning.nombre}" con este nombre exacto.</>)
                  : <><strong>Nombre similar:</strong> "{duplicadoWarning.nombre}" ya existe. Verifica que no sea un error de tipeo.</>
                }
              </div>
            </div>
          )}

          {/* ── S1: Identidad ── */}
          <div className="emp-section">
            <div className="emp-section-hdr">
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={13} style={{ color: '#2563EB' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Identidad</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="emp-form-label">Nombre completo <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    className="emp-form-input"
                    style={{ paddingLeft: 36 }}
                    value={form.nombre_completo}
                    onChange={onNombreChange}
                    placeholder="Ej: María Pérez González"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="emp-form-label">Correo electrónico</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    className="emp-form-input"
                    style={{ paddingLeft: 36 }}
                    type="email"
                    value={form.correo || ''}
                    onChange={f('correo')}
                    placeholder="correo@empresa.com"
                  />
                </div>
              </div>
              <div>
                <label className="emp-form-label">Cargo <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    className="emp-form-input"
                    style={{ paddingLeft: 36 }}
                    value={form.cargo || ''}
                    onChange={f('cargo')}
                    placeholder="Ej: Analista de cartera"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── S2: Área / Dependencia ── */}
          <div className="emp-section">
            <div className="emp-section-hdr">
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={13} style={{ color: '#7C3AED' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Dependencia / Área <span style={{ color: '#EF4444' }}>*</span></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {listaDepartamentos.map(d => {
                const sel = form.dependencia === d
                const [bg, text, border] = DEP_COLORS[d] || ['var(--info-bg)', 'var(--info-text)', 'color-mix(in srgb, var(--info) 30%, transparent)']
                return (
                  <button
                    key={d} type="button"
                    className={`emp-dep-btn ${sel ? 'active' : ''}`}
                    style={sel ? { background: bg, borderColor: border, color: text, boxShadow: `0 0 0 2px ${border}` } : {}}
                    onClick={() => { setForm(p => ({ ...p, dependencia: d })) }}
                  >
                    <span style={{ fontSize: 16 }}>{DEP_ICONS[d] || '🏢'}</span>
                    <span style={{ fontSize: 11, fontWeight: sel ? 800 : 600, color: sel ? text : 'var(--text)' }}>{d}</span>
                    {sel && <CheckCircle2 size={13} style={{ color: text, marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── S3: Fechas y estado ── */}
          <div className="emp-section">
            <div className="emp-section-hdr">
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={13} style={{ color: '#D97706' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Fecha de ingreso</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— opcional</span>
            </div>
            <input
              className="emp-form-input"
              type="date"
              value={form.fecha_ingreso || ''}
              onChange={f('fecha_ingreso')}
            />
          </div>

          {/* ── S4: Vacaciones - Ajuste Histórico ── */}
          <div className="emp-section">
            <div className="emp-section-hdr">
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                🌴
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                Días de vacaciones ya tomados (Histórico)
              </span>
            </div>
            <input
              className="emp-form-input"
              type="number"
              step="0.5"
              min="0"
              value={form.dias_vacaciones_tomados_manual ?? ''}
              onChange={f('dias_vacaciones_tomados_manual')}
              placeholder="0"
            />
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
              Ingresa los días que el colaborador ya disfrutó o cobró en el pasado para restarlos de su saldo actual.
            </p>
          </div>

          {/* ── S4: Estado ── */}
          <div className="emp-section" style={{ marginBottom: 4 }}>
            <div className="emp-section-hdr">
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>Estado del empleado</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="emp-status-btn"
                style={form.activo ? { border: '2px solid #16A34A', background: 'var(--success-bg)', color: 'var(--success-text)', boxShadow: '0 0 0 3px rgba(22,163,74,.12)' } : {}}
                onClick={() => setForm(p => ({ ...p, activo: true }))}>
                <span style={{ fontSize: 26 }}>✅</span>
                <span>Activo</span>
                {form.activo && <CheckCircle2 size={13} style={{ color: '#16A34A' }} />}
              </button>
              <button type="button" className="emp-status-btn"
                style={!form.activo ? { border: '2px solid #DC2626', background: 'var(--danger-bg)', color: 'var(--danger-text)', boxShadow: '0 0 0 3px rgba(220,38,38,.12)' } : {}}
                onClick={() => setForm(p => ({ ...p, activo: false, fecha_retiro: p.fecha_retiro || hoyISO() }))}>
                <span style={{ fontSize: 26 }}>🔴</span>
                <span>Inactivo</span>
                {!form.activo && <CheckCircle2 size={13} style={{ color: '#DC2626' }} />}
              </button>
            </div>
            {!form.activo && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 5, display: 'block' }}>
                  Fecha de retiro
                </label>
                <input
                  className="emp-form-input"
                  type="date"
                  value={form.fecha_retiro || ''}
                  onChange={f('fecha_retiro')}
                />
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Se usa en el Dashboard para no contar a este empleado en la tasa de ausentismo de periodos posteriores a esta fecha.
                </p>
              </div>
            )}
          </div>

          {msg && modal && <div className={`alert alert-${msg.type}`} style={{ marginTop: 8 }}>{msg.text}</div>}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          background: 'var(--bg)', borderRadius: '0 0 12px 12px',
        }}>
          {/* Resumen quick */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {[
              form.nombre_completo && '👤 ' + form.nombre_completo.split(' ')[0],
              form.dependencia && (DEP_ICONS[form.dependencia] || '🏢') + ' ' + form.dependencia,
              form.cargo && form.cargo,
              form.activo ? '✅ Activo' : '🔴 Inactivo',
            ].filter(Boolean).join(' · ') || 'Completa los campos obligatorios *'}
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>

            {duplicadoWarning?.tipo === 'exacto' ? (
              <button
                style={{ padding: '10px 18px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' }}
                onClick={() => save(true)} disabled={saving}>
                {saving
                  ? <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'empSpin .7s linear infinite' }} /> Guardando...</>
                  : <><AlertTriangle size={14} /> Guardar de todos modos</>}
              </button>
            ) : (
              <button
                disabled={saving || !form.nombre_completo}
                onClick={() => save(false)}
                style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
                  cursor: (saving || !form.nombre_completo) ? 'not-allowed' : 'pointer',
                  background: (saving || !form.nombre_completo) ? '#E5E7EB' : `linear-gradient(135deg,${gradStart},${gradEnd})`,
                  color: (saving || !form.nombre_completo) ? '#6B7280' : '#fff',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
                  boxShadow: (saving || !form.nombre_completo) ? 'none' : '0 4px 14px rgba(37,99,235,.3)',
                }}>
                {saving
                  ? <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'empSpin .7s linear infinite' }} /> Guardando...</>
                  : <><CheckCircle2 size={14} /> {modal === 'add' ? 'Crear empleado' : 'Guardar cambios'}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}