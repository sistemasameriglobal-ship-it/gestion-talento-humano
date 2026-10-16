import { useState, useMemo } from 'react'
import { UserX, CheckCircle2, Calendar, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
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

export default function AusentesHoyWidget({
  ausentesHoy = [],
  ausenciasPeriodo = [],
  onOpenExpediente,
}) {
  const [mostrarPeriodo, setMostrarPeriodo] = useState(false)
  const hoy = hoyISO()

  // 1. En la vista de "Ausentes hoy", filtrar estrictamente a los colaboradores cuya ausencia
  // esté activa hoy: hoy >= novedad.fecha_inicio && hoy < fechaRegreso.
  // Se excluyen los que ya regresaron o se reincorporan hoy (fechaRegreso <= hoy).
  const ausentesHoyActivos = useMemo(() => {
    return (ausentesHoy || []).filter(r => {
      const estado = evaluarEstadoTemporalAusencia(r, hoy)
      return estado?.esActivaHoy === true
    })
  }, [ausentesHoy, hoy])

  const listadoAMostrar = mostrarPeriodo ? ausenciasPeriodo : ausentesHoyActivos

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Cabecera del bloque */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: ausentesHoyActivos.length > 0 ? 'rgba(234, 88, 12, 0.14)' : 'rgba(22, 163, 74, 0.12)',
            color: ausentesHoyActivos.length > 0 ? '#EA580C' : '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {ausentesHoyActivos.length > 0 ? <UserX size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Colaboradores ausentes hoy
              </h3>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: ausentesHoyActivos.length > 0 ? 'rgba(234, 88, 12, 0.16)' : 'rgba(22, 163, 74, 0.14)',
                color: ausentesHoyActivos.length > 0 ? '#EA580C' : '#16A34A',
                border: `1px solid ${ausentesHoyActivos.length > 0 ? 'rgba(234, 88, 12, 0.3)' : 'rgba(22, 163, 74, 0.3)'}`,
              }}>
                {ausentesHoyActivos.length} {ausentesHoyActivos.length === 1 ? 'ausente' : 'ausentes'}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Fecha actual: {formatDDMMYYYY(hoy)}
            </div>
          </div>
        </div>

        {/* Toggle si hay ausencias en el periodo filtrado */}
        {ausenciasPeriodo.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setMostrarPeriodo(prev => !prev)}
          >
            {mostrarPeriodo ? (
              <>Ver solo ausentes de hoy <ChevronUp size={13} /></>
            ) : (
              <>Ver ausencias del período ({ausenciasPeriodo.length}) <ChevronDown size={13} /></>
            )}
          </button>
        )}
      </div>

      {/* Contenido */}
      {listadoAMostrar.length === 0 ? (
        <div className="db-empty-ausentes">
          <CheckCircle2 size={24} style={{ color: '#16A34A', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>
              ✓ No hay colaboradores ausentes el día de hoy
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Todos los colaboradores programados se encuentran activos sin novedades vigentes en esta fecha.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {listadoAMostrar.map((r, i) => {
            const cNorm = normalizarConcepto(r.concepto)
            const cColor = CONCEPTO_COLORS[cNorm] || '#EA580C'
            const estadoTemp = evaluarEstadoTemporalAusencia(r, hoy)

            const badgeClass =
              estadoTemp.badgeTipo === 'activa' ? 'db-badge-activa' :
              estadoTemp.badgeTipo === 'reincorporacion' ? 'db-badge-reincorporacion' :
              estadoTemp.badgeTipo === 'finalizada' ? 'db-badge-finalizada' :
              estadoTemp.badgeTipo === 'programada' ? 'db-badge-programada' :
              'badge tag-c'

            const chipClass =
              estadoTemp.chipTipo === 'activa' ? 'db-chip-activa' :
              estadoTemp.chipTipo === 'reincorporacion' ? 'db-chip-reincorporacion' :
              estadoTemp.chipTipo === 'finalizada' ? 'db-chip-finalizada' :
              estadoTemp.chipTipo === 'programada' ? 'db-chip-programada' :
              'db-regreso-pill'

            const isDoneOrToday = estadoTemp.chipTipo === 'finalizada' || estadoTemp.chipTipo === 'reincorporacion'

            return (
              <div
                key={r.id || `${r.nombre_empleado}-${i}`}
                className="db-ausente-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--bg)',
                  border: estadoTemp.esActivaHoy ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid var(--border)',
                  opacity: estadoTemp.estado === 'finalizada' ? 0.85 : 1,
                }}
              >
                {/* Info Colaborador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <div className="db-avatar-circle" style={{ background: cColor }}>
                    {iniciales(r.nombre_empleado)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      onClick={() => onOpenExpediente && onOpenExpediente(r.nombre_empleado)}
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--text)',
                        cursor: onOpenExpediente ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title="Ver expediente del colaborador"
                    >
                      <span className="hover:underline">{r.nombre_empleado}</span>
                      {onOpenExpediente && <ExternalLink size={12} style={{ opacity: 0.6, flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📍 {r.dependencia || 'Sin área'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Concepto, Badge de estado y Chip de Regreso */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {mostrarPeriodo && r.concepto && (
                      <span
                        className="badge tag-c"
                        style={{ '--tag': cColor, fontSize: 10.5, padding: '1px 7px', fontWeight: 700 }}
                      >
                        {r.concepto}
                      </span>
                    )}
                    <span className={badgeClass}>
                      {estadoTemp.badgeTexto}
                    </span>
                  </div>

                  <span className={chipClass} title={`Detalle temporal: ${estadoTemp.chipTexto}`}>
                    {isDoneOrToday ? (
                      <CheckCircle2 size={11} style={{ flexShrink: 0 }} />
                    ) : (
                      <Calendar size={11} style={{ flexShrink: 0 }} />
                    )}
                    {estadoTemp.chipTexto}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
