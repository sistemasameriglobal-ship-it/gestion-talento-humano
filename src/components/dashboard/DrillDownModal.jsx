import { useState, useMemo } from 'react'
import { X, Search, User, ExternalLink, Filter } from 'lucide-react'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { hoyISO } from '../../utils/fecha'
import { evaluarEstadoTemporalAusencia } from '../../utils/diasHabiles'

function iniciales(nombre) {
  const p = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0][0].toUpperCase()
  return (p[0][0] + p[1][0]).toUpperCase()
}

function formatDDMMYYYY(fechaISO) {
  if (!fechaISO) return '—'
  const clean = String(fechaISO).trim().slice(0, 10)
  const parts = clean.split('-')
  if (parts.length !== 3) return clean
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default function DrillDownModal({ drillDown, onCerrar, onVerExpediente, onFiltrar }) {
  const [busqueda, setBusqueda] = useState('')

  const registros = useMemo(() => drillDown?.registros || [], [drillDown])

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return registros
    const q = busqueda.toLowerCase().trim()
    return registros.filter(r =>
      (r.nombre_empleado && r.nombre_empleado.toLowerCase().includes(q)) ||
      (r.dependencia && r.dependencia.toLowerCase().includes(q)) ||
      (r.concepto && r.concepto.toLowerCase().includes(q)) ||
      (r.observacion && r.observacion.toLowerCase().includes(q))
    )
  }, [registros, busqueda])

  // Conteo de colaboradores únicos
  const empsUnicos = useMemo(() => {
    return new Set(registros.map(r => r.nombre_empleado).filter(Boolean)).size
  }, [registros])

  if (!drillDown) return null

  const esConcepto = drillDown.tipo === 'concepto'
  const colorBorde = drillDown.color || 'var(--primary)'

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Cabecera */}
        <div className="modal-header" style={{ borderLeft: `5px solid ${colorBorde}`, paddingLeft: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              className="badge tag-c"
              style={{ '--tag': colorBorde, fontSize: 12, padding: '3px 10px', fontWeight: 700 }}
            >
              {esConcepto ? 'Concepto' : 'Área'}
            </span>
            <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>{drillDown.titulo}</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ({registros.length} novedad{registros.length !== 1 ? 'es' : ''} · {empsUnicos} colaborador{empsUnicos !== 1 ? 'es' : ''})
            </span>
          </div>
          <button className="modal-close" onClick={onCerrar} title="Cerrar"><X size={18} /></button>
        </div>

        {/* Barra de herramientas */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
        }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar colaborador, observación..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: 30, fontSize: 12, height: 32 }}
            />
          </div>
          {onFiltrar && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, height: 32 }}
              onClick={() => {
                onFiltrar(drillDown.tipo, drillDown.titulo)
                onCerrar()
              }}
              title={`Aplicar filtro de ${drillDown.titulo} en todo el panel`}
            >
              <Filter size={13} /> Filtrar panel por este {esConcepto ? 'concepto' : 'área'}
            </button>
          )}
        </div>

        {/* Contenido / Lista de colaboradores */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              No se encontraron registros coincidentes.
            </div>
          ) : (
            filtrados.map((r, i) => {
              const cNorm = normalizarConcepto(r.concepto)
              const cColor = CONCEPTO_COLORS[cNorm] || '#64748B'
              const hoy = hoyISO()
              const estadoTemp = evaluarEstadoTemporalAusencia(r, hoy)

              const badgeClass =
                estadoTemp?.badgeTipo === 'activa' ? 'db-badge-activa' :
                estadoTemp?.badgeTipo === 'reincorporacion' ? 'db-badge-reincorporacion' :
                estadoTemp?.badgeTipo === 'finalizada' ? 'db-badge-finalizada' :
                estadoTemp?.badgeTipo === 'programada' ? 'db-badge-programada' :
                'badge tag-c'

              const chipClass =
                estadoTemp?.chipTipo === 'activa' ? 'db-chip-activa' :
                estadoTemp?.chipTipo === 'reincorporacion' ? 'db-chip-reincorporacion' :
                estadoTemp?.chipTipo === 'finalizada' ? 'db-chip-finalizada' :
                estadoTemp?.chipTipo === 'programada' ? 'db-chip-programada' :
                'db-regreso-pill'

              return (
                <div
                  key={r.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--bg)',
                    border: estadoTemp?.esActivaHoy ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid var(--border)',
                    opacity: estadoTemp?.estado === 'finalizada' ? 0.88 : 1,
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Colaborador + Datos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240, flex: '1 1 260px' }}>
                    <div className="db-avatar-circle" style={{ background: colorBorde }}>
                      {iniciales(r.nombre_empleado)}
                    </div>
                    <div>
                      <div
                        onClick={() => onVerExpediente && onVerExpediente(r.nombre_empleado)}
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: 'var(--text)',
                          cursor: onVerExpediente ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        title="Ver expediente del colaborador"
                      >
                        {r.nombre_empleado}
                        {onVerExpediente && <ExternalLink size={12} style={{ opacity: 0.6 }} />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, flexWrap: 'wrap' }}>
                        <span>📍 {r.dependencia || 'Sin área'}</span>
                        {!esConcepto && (
                          <span
                            className="badge tag-c"
                            style={{ '--tag': cColor, fontSize: 10.5, padding: '1px 6px' }}
                          >
                            {r.concepto}
                          </span>
                        )}
                        {estadoTemp && (
                          <span className={badgeClass} style={{ fontSize: 10, padding: '1px 7px' }}>
                            {estadoTemp.badgeTexto}
                          </span>
                        )}
                        {r.periodo && <span>📅 {r.periodo}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Fechas y Días */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {formatDDMMYYYY(r.fecha_inicio)}
                        {r.fecha_fin && r.fecha_fin !== r.fecha_inicio ? ` → ${formatDDMMYYYY(r.fecha_fin)}` : ''}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        {r.total_dias != null && r.total_dias !== '' && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: colorBorde }}>
                            {r.total_dias} día{r.total_dias !== 1 ? 's' : ''}
                          </span>
                        )}
                        {estadoTemp && estadoTemp.chipTexto !== '—' && (
                          <span className={chipClass} style={{ fontSize: 10, padding: '1px 7px' }}>
                            {estadoTemp.chipTexto}
                          </span>
                        )}
                      </div>
                    </div>

                    {onVerExpediente && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onVerExpediente(r.nombre_empleado)}
                      >
                        <User size={12} /> Ver ficha
                      </button>
                    )}
                  </div>

                  {/* Observación o diagnóstico si existe */}
                  {(r.observacion || r.diagnostico) && (
                    <div style={{
                      width: '100%',
                      fontSize: 11.5,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-card)',
                      borderRadius: 6,
                      padding: '6px 10px',
                      marginTop: 2,
                      borderLeft: `3px solid ${colorBorde}`,
                    }}>
                      {r.diagnostico && <div><strong>Diagnóstico:</strong> {r.diagnostico}</div>}
                      {r.observacion && <div>{r.observacion}</div>}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
