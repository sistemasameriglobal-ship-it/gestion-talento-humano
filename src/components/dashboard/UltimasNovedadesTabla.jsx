import { Eye, ExternalLink } from 'lucide-react'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'

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

export default function UltimasNovedadesTabla({
  novedades = [],
  onVerDetalle,
  onOpenExpediente,
}) {
  if (!novedades || novedades.length === 0) return null

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Últimas novedades registradas
          </h3>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Los 5 registros más recientes del periodo seleccionado
          </p>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
          Mostrando {novedades.length} registros
        </span>
      </div>

      <div className="db-table-wrap">
        <table className="db-ultimas-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Concepto</th>
              <th>Área / Dependencia</th>
              <th>Fechas y Días</th>
              <th>Estado / Validación</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {novedades.map((r, i) => {
              const cNorm = normalizarConcepto(r.concepto)
              const cColor = CONCEPTO_COLORS[cNorm] || '#6366F1'

              const validacion = r.validacion_incapacidad
              const radicacion = r.radicacion_incapacidad
              const prorrog = r.prorroga

              return (
                <tr key={r.id || i}>
                  {/* Colaborador */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="db-avatar-circle" style={{ background: cColor, width: 28, height: 28, fontSize: 11 }}>
                        {iniciales(r.nombre_empleado)}
                      </div>
                      <div>
                        <div
                          onClick={() => onOpenExpediente && onOpenExpediente(r.nombre_empleado)}
                          style={{
                            fontWeight: 700,
                            color: 'var(--text)',
                            cursor: onOpenExpediente ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Ver expediente"
                        >
                          {r.nombre_empleado}
                          {onOpenExpediente && <ExternalLink size={11} style={{ opacity: 0.6 }} />}
                        </div>
                        {r.numero_documento && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            CC {r.numero_documento}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Concepto */}
                  <td>
                    <span
                      className="badge tag-c"
                      style={{ '--tag': cColor, fontSize: 11, padding: '2px 8px', fontWeight: 700 }}
                    >
                      {r.concepto}
                    </span>
                  </td>

                  {/* Área */}
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📍 {r.dependencia || 'Sin área'}
                  </td>

                  {/* Fechas */}
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {formatDDMMYYYY(r.fecha_inicio)}
                      {r.fecha_fin && r.fecha_fin !== r.fecha_inicio ? ` → ${formatDDMMYYYY(r.fecha_fin)}` : ''}
                    </div>
                    {r.total_dias != null && r.total_dias !== '' && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {r.total_dias} día{r.total_dias !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>

                  {/* Estado / Validación */}
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {validacion ? (
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: validacion.toLowerCase().includes('ok') || validacion.toLowerCase().includes('si') || validacion.toLowerCase().includes('válid')
                            ? 'rgba(22, 163, 74, 0.12)'
                            : 'rgba(217, 119, 6, 0.12)',
                          color: validacion.toLowerCase().includes('ok') || validacion.toLowerCase().includes('si') || validacion.toLowerCase().includes('válid')
                            ? '#16A34A'
                            : '#D97706',
                          border: '1px solid var(--border)',
                        }}>
                          Val: {validacion}
                        </span>
                      ) : null}
                      {radicacion ? (
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: 'rgba(3, 105, 161, 0.1)',
                          color: '#0369A1',
                          border: '1px solid var(--border)',
                        }}>
                          Rad: {radicacion}
                        </span>
                      ) : null}
                      {prorrog ? (
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: 'rgba(124, 58, 237, 0.1)',
                          color: '#7C3AED',
                          border: '1px solid var(--border)',
                        }}>
                          Prórroga
                        </span>
                      ) : null}
                      {!validacion && !radicacion && !prorrog && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Acción rápida */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {onVerDetalle && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => onVerDetalle({
                            nombre: r.nombre_empleado,
                            concepto: r.concepto,
                            color: cColor,
                            registros: [r],
                          })}
                          title="Ver detalle del registro"
                        >
                          <Eye size={12} /> Detalle
                        </button>
                      )}
                      {onOpenExpediente && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => onOpenExpediente(r.nombre_empleado)}
                          title="Abrir expediente completo"
                        >
                          Expediente
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
