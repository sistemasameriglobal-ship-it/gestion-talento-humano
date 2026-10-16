import { useState } from 'react'
import { UserX, CheckCircle2, Calendar, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { normalizarConcepto, CONCEPTO_COLORS } from '../../utils/parseExcel'
import { hoyISO } from '../../utils/fecha'
import { obtenerFechaRegresoLaboral } from '../../utils/diasHabiles'

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

  const listadoAMostrar = mostrarPeriodo ? ausenciasPeriodo : ausentesHoy

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
            background: ausentesHoy.length > 0 ? 'rgba(234, 88, 12, 0.14)' : 'rgba(22, 163, 74, 0.12)',
            color: ausentesHoy.length > 0 ? '#EA580C' : '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {ausentesHoy.length > 0 ? <UserX size={18} /> : <CheckCircle2 size={18} />}
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
                background: ausentesHoy.length > 0 ? 'rgba(234, 88, 12, 0.16)' : 'rgba(22, 163, 74, 0.14)',
                color: ausentesHoy.length > 0 ? '#EA580C' : '#16A34A',
                border: `1px solid ${ausentesHoy.length > 0 ? 'rgba(234, 88, 12, 0.3)' : 'rgba(22, 163, 74, 0.3)'}`,
              }}>
                {ausentesHoy.length} {ausentesHoy.length === 1 ? 'ausente' : 'ausentes'}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Fecha actual: {formatDDMMYYYY(hoy)}
            </div>
          </div>
        </div>

        {/* Toggle si hay ausencias en el periodo filtrado pero no hoy */}
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
            const finEfectiva = r.fecha_fin || r.fecha_inicio
            const fechaRegreso = finEfectiva ? obtenerFechaRegresoLaboral(finEfectiva) : null

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
                  border: '1px solid var(--border)',
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

                {/* Concepto y Regreso */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span
                    className="badge tag-c"
                    style={{ '--tag': cColor, fontSize: 11, padding: '2px 8px', fontWeight: 700 }}
                  >
                    {r.concepto}
                  </span>
                  {fechaRegreso ? (
                    <span className="db-regreso-pill" title={`Fecha efectiva de retorno: ${formatDDMMYYYY(fechaRegreso)}`}>
                      <Calendar size={11} style={{ flexShrink: 0 }} /> Regresa: {formatDDMMYYYY(fechaRegreso)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Desde {formatDDMMYYYY(r.fecha_inicio)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
