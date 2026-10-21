// =============================================================
// src/components/usuarios/ModalAuditLogs.jsx
// -------------------------------------------------------------
// Visor de Auditoría del Sistema para Administradores.
// =============================================================
import { useState, useEffect, useCallback, useMemo } from 'react'
import * as auditLogsApi from '../../api/auditLogs'
import { useCompany } from '../../context/CompanyContext'
import { X, Search, Shield, RefreshCw, Mail, FileText, Clock } from 'lucide-react'

export default function ModalAuditLogs({ onClose }) {
  const { currentCompany, companyConfig } = useCompany()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAccion, setFilterAccion] = useState('')

  const cargarLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await auditLogsApi.listarAuditLogs(currentCompany, { limite: 150 })
    setLogs(data || [])
    setLoading(false)
  }, [currentCompany])

  useEffect(() => {
    Promise.resolve().then(() => cargarLogs())
  }, [cargarLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = !search || (
        (log.correo_usuario || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.tabla || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.accion || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.registro_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (typeof log.detalles === 'object' ? JSON.stringify(log.detalles) : String(log.detalles || '')).toLowerCase().includes(search.toLowerCase())
      )
      const matchAccion = !filterAccion || log.accion === filterAccion
      return matchSearch && matchAccion
    })
  }, [logs, search, filterAccion])

  const formatHora = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d)) return '—'
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const badgeAccionStyle = (accion) => {
    const act = (accion || '').toUpperCase()
    if (act.includes('CREAR')) return { bg: 'var(--success-bg)', color: '#15803D', border: 'color-mix(in srgb, var(--success) 35%, transparent)' }
    if (act.includes('ACTUALIZAR') || act.includes('EDITAR')) return { bg: 'var(--warning-bg)', color: '#B45309', border: 'color-mix(in srgb, var(--warning) 40%, transparent)' }
    if (act.includes('ELIMINAR') || act.includes('BORRAR')) return { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'color-mix(in srgb, var(--danger) 35%, transparent)' }
    return { bg: 'var(--info-bg)', color: 'var(--info-text)', border: 'color-mix(in srgb, var(--info) 35%, transparent)' }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ animation: 'fadeIn .2s ease', zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 850, padding: 0, overflow: 'hidden', borderRadius: 16 }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              <Shield size={22} style={{ color: '#38BDF8' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Historial de Auditoría del Sistema</h2>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
                Registro trazable de acciones realizadas en {companyConfig.nombre}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}>
            <X size={20} />
          </button>
        </div>

        {/* Filtros */}
        <div style={{ padding: '14px 24px', background: 'var(--bg,#F8FAFC)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 30, fontSize: 12 }}
              placeholder="Buscar por usuario, módulo o id..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 160, fontSize: 12 }}
            value={filterAccion}
            onChange={e => setFilterAccion(e.target.value)}
          >
            <option value="">Todas las acciones</option>
            <option value="CREAR">Crear</option>
            <option value="ACTUALIZAR">Actualizar</option>
            <option value="ELIMINAR">Eliminar</option>
          </select>
          <button
            className="btn btn-ghost"
            onClick={cargarLogs}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <RefreshCw size={13} className={loading ? 'pr-refresh--spin' : ''} /> Refrescar
          </button>
        </div>

        {/* Tabla de Logs */}
        <div style={{ maxHeight: 450, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando auditoría...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay registros de auditoría que coincidan con la búsqueda.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 6px' }}>Fecha y Hora</th>
                  <th style={{ padding: '8px 6px' }}>Usuario</th>
                  <th style={{ padding: '8px 6px' }}>Acción</th>
                  <th style={{ padding: '8px 6px' }}>Módulo</th>
                  <th style={{ padding: '8px 6px' }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const style = badgeAccionStyle(log.accion)
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 6px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 11 }}>
                        <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {formatHora(log.created_at)}
                      </td>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>
                        <Mail size={11} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--text-muted)' }} />
                        {log.correo_usuario || 'Sistema'}
                      </td>
                      <td style={{ padding: '10px 6px' }}>
                        <span style={{
                          background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                          padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                        }}>
                          {log.accion}
                        </span>
                      </td>
                      <td style={{ padding: '10px 6px', textTransform: 'capitalize', fontWeight: 600 }}>
                        <FileText size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {log.tabla}
                      </td>
                      <td style={{ padding: '10px 6px', color: 'var(--text-muted)', fontSize: 11 }}>
                        {log.registro_id ? `ID: ${log.registro_id.slice(0, 8)}... ` : ''}
                        {log.detalles && typeof log.detalles === 'object'
                          ? (log.detalles.descripcion || log.detalles.detalle || JSON.stringify(log.detalles))
                          : (log.detalles || '')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', background: 'var(--bg,#F8FAFC)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Mostrando {filteredLogs.length} registros recientes en {companyConfig.nombre}
          </span>
          <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>

      </div>
    </div>
  )
}
