import { useState } from 'react'
import { X, Calendar, Building2, AlertCircle, ArrowRight, ShieldCheck, Check, Loader2 } from 'lucide-react'
import { hoyISO } from '../../utils/fecha'
import { DEPENDENCIAS_EXTENDIDAS } from '../../constants'
import { useCompany } from '../../context/CompanyContext'

export default function ModalSustitucionPatronal({
  emp,
  onClose,
  onConfirm,
  saving,
  departamentosGlobalLink = ['COBRANZA'],
}) {
  const { empresasDisponibles } = useCompany()
  const empresasLista = empresasDisponibles && empresasDisponibles.length > 0
    ? empresasDisponibles
    : [
        { id: 'ameriglobal', codigo: 'ameriglobal', nombre: 'AmeriGlobal', razonSocial: 'AmeriGlobal S.A.S.', icono: '🏢', colorPrincipal: '#2563EB', colorSecundario: '#1D4ED8', colorFondoTag: '#EFF6FF' },
        { id: 'global_link', codigo: 'global_link', nombre: 'Global Link', razonSocial: 'Global Link BPO S.A.S.', icono: '🌐', colorPrincipal: '#0D9488', colorSecundario: '#0F766E', colorFondoTag: '#F0FDFA' },
      ]

  const empresaOrigenKey = emp?.empresa || 'ameriglobal'
  const otraEmpresa = empresasLista.find(e => (e.codigo || e.id) !== empresaOrigenKey)
  const empresaDestinoDefault = otraEmpresa ? (otraEmpresa.codigo || otraEmpresa.id) : (empresaOrigenKey === 'ameriglobal' ? 'global_link' : 'ameriglobal')

  const [empresaDestino, setEmpresaDestino] = useState(empresaDestinoDefault)
  const [fechaSustitucion, setFechaSustitucion] = useState(hoyISO())
  const [cargo, setCargo] = useState(emp?.cargo || '')
  const [dependencia, setDependencia] = useState(emp?.dependencia || '')

  const origen = empresasLista.find(e => (e.codigo || e.id) === empresaOrigenKey) || empresasLista[0]
  const destino = empresasLista.find(e => (e.codigo || e.id) === empresaDestino) || otraEmpresa || empresasLista[0]

  const [observaciones, setObservaciones] = useState(() => {
    const origNom = origen?.nombre || 'AmeriGlobal'
    const destNom = destino?.nombre || 'Global Link'
    return `Sustitución patronal de ${origNom} a ${destNom}. Se preserva la antigüedad laboral y fecha de ingreso original (${emp?.fecha_ingreso || 'vigente'}) con continuidad contractual plena.`
  })
  const [error, setError] = useState(null)

  const listaDependencias = empresaDestino === 'global_link'
    ? (departamentosGlobalLink.length > 0 ? departamentosGlobalLink : ['COBRANZA'])
    : DEPENDENCIAS_EXTENDIDAS

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fechaSustitucion) {
      setError('La fecha de la sustitución patronal es obligatoria.')
      return
    }
    if (empresaOrigenKey === empresaDestino) {
      setError('La empresa de destino debe ser diferente a la empresa de origen.')
      return
    }
    setError(null)
    onConfirm({
      empresa_destino: empresaDestino,
      fecha_sustitucion: fechaSustitucion,
      dependencia: dependencia.trim() || emp?.dependencia || null,
      cargo: cargo.trim() || emp?.cargo || null,
      observaciones: observaciones.trim(),
    })
  }

  return (
    <div className="modal-backdrop" tabIndex={-1}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#EEF2FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#4338CA',
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Sustitución Patronal</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Cambio de Razón Social — {emp?.nombre_completo}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error" style={{ marginBottom: 14 }}><AlertCircle size={15} /> {error}</div>}

            {/* ── Banner informativo de continuidad legal ── */}
            <div style={{
              display: 'flex',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 10,
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              marginBottom: 16,
              color: '#3730A3',
              fontSize: 12.5,
              lineHeight: 1.45,
            }}>
              <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: 1, color: '#4338CA' }} />
              <div>
                <strong>Garantía de Continuidad Laboral:</strong>
                <p style={{ margin: '3px 0 0', opacity: 0.9 }}>
                  El colaborador conservará su <strong>antigüedad y fecha de ingreso original ({emp?.fecha_ingreso || '—'})</strong>. Todo su historial de <strong>Novedades</strong>, <strong>Procesos Disciplinarios</strong>, <strong>Productividad</strong> y <strong>Vacaciones</strong> se transferirá íntegramente a la nueva razón social.
                </p>
              </div>
            </div>

            {/* ── Transición visual de empresas ── */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Transición de Razón Social
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                {/* Origen */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: origen?.colorFondoTag || '#EFF6FF',
                  border: `1px solid color-mix(in srgb, ${origen?.colorPrincipal || '#2563EB'} 30%, #BFDBFE)`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: origen?.colorSecundario || origen?.colorPrincipal || '#2563EB', textTransform: 'uppercase' }}>Empresa Actual</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: origen?.colorSecundario || origen?.colorPrincipal || '#2563EB', marginTop: 3 }}>
                    {origen?.icono} {origen?.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {origen?.razonSocial}
                  </div>
                </div>

                {/* Flecha */}
                <div style={{ display: 'flex', justifyContent: 'center', color: '#6366F1' }}>
                  <ArrowRight size={20} />
                </div>

                {/* Destino */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: destino?.colorFondoTag || '#F0FDFA',
                  border: `2px solid ${destino?.colorPrincipal || '#0D9488'}`,
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: destino?.colorSecundario || destino?.colorPrincipal || '#0D9488', textTransform: 'uppercase' }}>Nueva Razón Social</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: destino?.colorSecundario || destino?.colorPrincipal || '#0D9488', marginTop: 3 }}>
                    {destino?.icono} {destino?.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {destino?.razonSocial}
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de empresa destino si se desea cambiar */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Seleccionar Empresa Destino</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 4 }}>
                {empresasLista.map(e => {
                  const eCode = e.codigo || e.id
                  const isSelected = empresaDestino === eCode
                  const isOrigen = eCode === empresaOrigenKey
                  return (
                    <button
                      key={eCode}
                      type="button"
                      onClick={() => {
                        setEmpresaDestino(eCode)
                        const origNom = origen?.nombre || 'AmeriGlobal'
                        setObservaciones(`Sustitución patronal de ${origNom} a ${e.nombre}. Se preserva la antigüedad laboral y fecha de ingreso original (${emp?.fecha_ingreso || 'vigente'}) con continuidad contractual plena.`)
                      }}
                      disabled={isOrigen}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: isSelected ? `2px solid ${e.colorPrincipal || '#2563EB'}` : '1px solid var(--border)',
                        background: isSelected ? (e.colorFondoTag || '#EFF6FF') : 'var(--bg)',
                        cursor: isOrigen ? 'not-allowed' : 'pointer',
                        opacity: isOrigen ? 0.45 : 1,
                        fontWeight: 600,
                        fontSize: 12.5,
                        color: isSelected ? (e.colorSecundario || e.colorPrincipal || '#1D4ED8') : 'var(--text)',
                        textAlign: 'center',
                      }}
                    >
                      {e.icono || '🏢'} {e.nombre} {isOrigen ? '(Origen actual)' : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Fecha de sustitución ── */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} style={{ color: 'var(--primary)' }} />
                Fecha Efectiva de la Sustitución Patronal
              </label>
              <input
                className="form-control"
                type="date"
                value={fechaSustitucion}
                onChange={e => setFechaSustitucion(e.target.value)}
                required
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                Fecha legal a partir de la cual el colaborador pasa a la nómina de {destino.nombre}.
              </span>
            </div>

            {/* ── Cargo y Dependencia en la nueva empresa ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Cargo en {destino.nombre}</label>
                <input
                  className="form-control"
                  type="text"
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  placeholder="Ej: Asesor de Cobranza"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Área / Dependencia</label>
                <select
                  className="form-control"
                  value={dependencia}
                  onChange={e => setDependencia(e.target.value)}
                  required
                >
                  <option value="">Seleccionar área...</option>
                  {listaDependencias.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  {dependencia && !listaDependencias.includes(dependencia) && (
                    <option value={dependencia}>{dependencia}</option>
                  )}
                </select>
              </div>
            </div>

            {/* ── Observaciones ── */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Observaciones / Motivo</label>
              <textarea
                className="form-control"
                rows={3}
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Observaciones de la sustitución patronal..."
              />
            </div>

            {/* ── Resumen de acciones automáticas ── */}
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 11.5,
              color: 'var(--text-muted)',
              marginBottom: 18,
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                Acciones automáticas que se aplicarán:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <li>Se traslada el colaborador a la razón social <strong>{destino.razonSocial}</strong>.</li>
                <li>Se conserva intacta su fecha de ingreso original (<strong>{emp?.fecha_ingreso || '—'}</strong>).</li>
                <li>Se transfiere todo su historial de <strong>Novedades</strong>, <strong>Procesos Disciplinarios</strong>, <strong>Productividad</strong> y <strong>Vacaciones</strong>.</li>
                <li>Se registra automáticamente una novedad con concepto <strong>"Sustitución Patronal"</strong>.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ background: '#4338CA', borderColor: '#3730A3', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                {saving ? 'Procesando sustitución...' : 'Confirmar Sustitución Patronal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
