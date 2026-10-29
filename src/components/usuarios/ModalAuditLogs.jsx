// =============================================================
// src/components/usuarios/ModalAuditLogs.jsx
// -------------------------------------------------------------
// Visor Premium de Auditoría del Sistema para Administradores.
// Rediseñado con ancho extendido (96vw / 1420px), KPIs rápidos,
// filtros avanzados, formateo amigable de detalles y exportación.
// =============================================================
import { useState, useEffect, useCallback, useMemo } from 'react'
import * as auditLogsApi from '../../api/auditLogs'
import { useCompany } from '../../context/CompanyContext'
import AnimatedModal from '../ui/AnimatedModal'
import {
  X,
  Search,
  Shield,
  RefreshCw,
  Mail,
  FileText,
  Clock,
  Download,
  Filter,
  PlusCircle,
  Edit3,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Calendar,
  Layers,
  Gavel,
  FileSignature,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Activity,
  Building2,
  CalendarRange,
} from 'lucide-react'

const MODULOS_MAP = {
  empleados: { label: 'Empleados', icon: Users, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  novedades: { label: 'Novedades', icon: FileText, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  vacaciones: { label: 'Vacaciones', icon: Calendar, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  procesos_disciplinarios: { label: 'Proc. Disciplinarios', icon: Gavel, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  contratos: { label: 'Contratos', icon: FileSignature, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  usuarios: { label: 'Usuarios', icon: Shield, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  parqueadero: { label: 'Parqueadero', icon: Layers, color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
  sistema: { label: 'Sistema', icon: RefreshCw, color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
}

const ACCIONES_CONFIG = {
  CREAR: { label: 'Creación', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', icon: PlusCircle },
  ACTUALIZAR: { label: 'Modificación', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: Edit3 },
  EDITAR: { label: 'Modificación', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: Edit3 },
  ELIMINAR: { label: 'Eliminación', bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', icon: Trash2 },
  BORRAR: { label: 'Eliminación', bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', icon: Trash2 },
  RETIRAR: { label: 'Retiro Empleado', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', icon: UserMinus },
  REINTEGRAR: { label: 'Reintegro', bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', icon: UserPlus },
  AJUSTE_SALARIAL: { label: 'Ajuste Salarial', bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE', icon: Layers },
  LIQUIDAR: { label: 'Liquidación', bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3', icon: FileText },
  SUSTITUCION_PATRONAL: { label: 'Sustitución', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', icon: Building2 },
}

export default function ModalAuditLogs({ onClose }) {
  const { currentCompany, companyConfig } = useCompany()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAccion, setFilterAccion] = useState('')
  const [filterModulo, setFilterModulo] = useState('')
  const [filterFecha, setFilterFecha] = useState('todos') // 'todos' | 'hoy' | '7dias' | '30dias'
  const [expandedLogId, setExpandedLogId] = useState(null)
  const [idCopiado, setIdCopiado] = useState(null)

  // Paginación
  const [pagina, setPagina] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(25)

  const cargarLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await auditLogsApi.listarAuditLogs(currentCompany, { limite: 250 })
      setLogs(data || [])
    } catch (err) {
      console.error('Error cargando logs de auditoría:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [currentCompany])

  useEffect(() => {
    cargarLogs()
  }, [cargarLogs])

  // KPIs / Estadísticas Rápidas
  const stats = useMemo(() => {
    const total = logs.length
    let creaciones = 0
    let actualizaciones = 0
    let eliminaciones = 0
    logs.forEach(l => {
      const act = (l.accion || '').toUpperCase()
      if (act.includes('CREAR') || act.includes('INSERT') || act.includes('REINTEGRAR')) creaciones++
      else if (act.includes('ACTUALIZAR') || act.includes('EDIT') || act.includes('AJUSTE')) actualizaciones++
      else if (act.includes('ELIMINAR') || act.includes('BORRAR') || act.includes('RETIR') || act.includes('LIQUIDAR')) eliminaciones++
    })
    return { total, creaciones, actualizaciones, eliminaciones }
  }, [logs])

  // Módulos únicos encontrados en los logs
  const modulosDisponibles = useMemo(() => {
    const setMod = new Set(logs.map(l => l.tabla).filter(Boolean))
    return Array.from(setMod).sort()
  }, [logs])

  // Filtrado de logs
  const filteredLogs = useMemo(() => {
    const ahora = new Date()

    return logs.filter(log => {
      // 1. Filtro de Búsqueda de texto
      const searchNorm = search.toLowerCase().trim()
      let matchSearch = true
      if (searchNorm) {
        const strDetalles = typeof log.detalles === 'object' ? JSON.stringify(log.detalles) : String(log.detalles || '')
        matchSearch = (
          (log.correo_usuario || '').toLowerCase().includes(searchNorm) ||
          (log.tabla || '').toLowerCase().includes(searchNorm) ||
          (log.accion || '').toLowerCase().includes(searchNorm) ||
          (log.registro_id || '').toLowerCase().includes(searchNorm) ||
          strDetalles.toLowerCase().includes(searchNorm)
        )
      }

      // 2. Filtro de Acción
      const matchAccion = !filterAccion || log.accion === filterAccion

      // 3. Filtro de Módulo
      const matchModulo = !filterModulo || (log.tabla || '').toLowerCase() === filterModulo.toLowerCase()

      // 4. Filtro de Fecha
      let matchFecha = true
      if (filterFecha !== 'todos' && log.created_at) {
        const d = new Date(log.created_at)
        const diffHoras = (ahora - d) / (1000 * 60 * 60)
        if (filterFecha === 'hoy') {
          matchFecha = diffHoras <= 24
        } else if (filterFecha === '7dias') {
          matchFecha = diffHoras <= (24 * 7)
        } else if (filterFecha === '30dias') {
          matchFecha = diffHoras <= (24 * 30)
        }
      }

      return matchSearch && matchAccion && matchModulo && matchFecha
    })
  }, [logs, search, filterAccion, filterModulo, filterFecha])

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setPagina(1)
  }, [search, filterAccion, filterModulo, filterFecha, tamanoPagina])

  // Paginación
  const totalPaginas = Math.ceil(filteredLogs.length / tamanoPagina) || 1
  const paginatedLogs = useMemo(() => {
    const start = (pagina - 1) * tamanoPagina
    return filteredLogs.slice(start, start + tamanoPagina)
  }, [filteredLogs, pagina, tamanoPagina])

  // Formato de hora amigable
  const formatFechaYHora = (iso) => {
    if (!iso) return { fechaStr: '—', horaStr: '—', relativa: '' }
    const d = new Date(iso)
    if (isNaN(d)) return { fechaStr: '—', horaStr: '—', relativa: '' }

    const ahora = new Date()
    const diffSeg = Math.floor((ahora - d) / 1000)

    let relativa = ''
    if (diffSeg < 60) relativa = 'Hace un momento'
    else if (diffSeg < 3600) relativa = `Hace ${Math.floor(diffSeg / 60)} min`
    else if (diffSeg < 86400) relativa = `Hace ${Math.floor(diffSeg / 3600)} h`
    else {
      const dias = Math.floor(diffSeg / 86400)
      relativa = dias === 1 ? 'Ayer' : `Hace ${dias} días`
    }

    const fechaStr = d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const horaStr = d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })

    return { fechaStr, horaStr, relativa }
  }

  // Copiar ID al portapapeles
  const handleCopyId = (id) => {
    if (!id) return
    navigator.clipboard.writeText(id)
    setIdCopiado(id)
    setTimeout(() => setIdCopiado(null), 2000)
  }

  // Exportar logs a CSV
  const exportarCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) return
    const headers = ['Fecha', 'Hora', 'Usuario', 'Accion', 'Modulo', 'Registro_ID', 'Detalles']
    const rows = filteredLogs.map(l => {
      const d = new Date(l.created_at)
      const fecha = isNaN(d) ? '' : d.toLocaleDateString('es-CO')
      const hora = isNaN(d) ? '' : d.toLocaleTimeString('es-CO')
      const detallesStr = typeof l.detalles === 'object' ? JSON.stringify(l.detalles) : String(l.detalles || '')
      return [
        `"${fecha}"`,
        `"${hora}"`,
        `"${l.correo_usuario || 'Sistema'}"`,
        `"${l.accion || ''}"`,
        `"${l.tabla || ''}"`,
        `"${l.registro_id || ''}"`,
        `"${detallesStr.replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Auditoria_${currentCompany || 'sistema'}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Helper de avatar
  const getAvatarInitials = (correo) => {
    if (!correo || correo === 'Sistema') return 'SYS'
    const namePart = correo.split('@')[0] || ''
    const clean = namePart.replace(/[^a-zA-Z]/g, '')
    if (clean.length >= 2) return clean.slice(0, 2).toUpperCase()
    return clean.slice(0, 1).toUpperCase() || 'U'
  }

  return (
    <AnimatedModal
      open={true}
      onRequestClose={onClose}
      maxWidth="1420px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '20px', paddingBottom: '24px' }}
      modalStyle={{
        width: '96vw',
        maxWidth: '1420px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* 1. HEADER MODERNO PREMIUM CON GRADIENTE Y CONTROLES */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        padding: '20px 28px',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        borderBottom: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(37, 99, 235, 0.3))',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38BDF8',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)',
          }}>
            <Shield size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                Historial de Auditoría del Sistema
              </h2>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {companyConfig.nombre || 'AmeriGlobal S.A.S'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#94A3B8' }}>
              Registro inmutable de trazabilidad y seguridad de las operaciones realizadas en la plataforma.
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={exportarCSV}
            disabled={filteredLogs.length === 0}
            title="Exportar registros filtrados a archivo CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (filteredLogs.length > 0) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
          >
            <Download size={15} color="#38BDF8" />
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.borderColor = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)' }}
          >
            <X size={19} />
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE ESTADÍSTICAS RÁPIDAS (KPIS) */}
      <div style={{
        padding: '14px 28px',
        background: 'var(--bg, #F8FAFC)',
        borderBottom: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {/* Total */}
        <div style={{
          background: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB',
          }}>
            <Activity size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total Registros</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{stats.total}</div>
          </div>
        </div>

        {/* Creaciones */}
        <div style={{
          background: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#DCFCE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803D',
          }}>
            <PlusCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Creaciones</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#15803D' }}>{stats.creaciones}</div>
          </div>
        </div>

        {/* Modificaciones */}
        <div style={{
          background: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8',
          }}>
            <Edit3 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Modificaciones</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1D4ED8' }}>{stats.actualizaciones}</div>
          </div>
        </div>

        {/* Eliminaciones */}
        <div style={{
          background: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#FEE2E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B91C1C',
          }}>
            <Trash2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Eliminaciones / Bajas</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#B91C1C' }}>{stats.eliminaciones}</div>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS AVANZADOS */}
      <div style={{
        padding: '12px 28px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 320 }}>
          {/* Input de Búsqueda */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 440 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{
                paddingLeft: 34,
                paddingRight: search ? 30 : 12,
                fontSize: 12.5,
                height: 38,
                borderRadius: 8,
              }}
              placeholder="Buscar por usuario, módulo, empleado, concepto o ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por Acción */}
          <select
            className="form-control"
            style={{ width: 170, fontSize: 12.5, height: 38, borderRadius: 8 }}
            value={filterAccion}
            onChange={e => setFilterAccion(e.target.value)}
          >
            <option value="">Todas las acciones</option>
            <option value="CREAR">🟢 Creación (CREAR)</option>
            <option value="ACTUALIZAR">🔵 Modificación (ACTUALIZAR)</option>
            <option value="ELIMINAR">🔴 Eliminación (ELIMINAR)</option>
            <option value="RETIRAR">🟠 Retiro de Colaborador</option>
            <option value="REINTEGRAR">🟢 Reintegro</option>
            <option value="AJUSTE_SALARIAL">🟣 Ajuste Salarial</option>
            <option value="LIQUIDAR">🔴 Liquidación</option>
          </select>

          {/* Filtro por Módulo */}
          <select
            className="form-control"
            style={{ width: 160, fontSize: 12.5, height: 38, borderRadius: 8 }}
            value={filterModulo}
            onChange={e => setFilterModulo(e.target.value)}
          >
            <option value="">Todos los módulos</option>
            {modulosDisponibles.map(m => (
              <option key={m} value={m}>
                {MODULOS_MAP[m.toLowerCase()]?.label || m}
              </option>
            ))}
          </select>

          {/* Filtro de Rango Temporal */}
          <select
            className="form-control"
            style={{ width: 150, fontSize: 12.5, height: 38, borderRadius: 8 }}
            value={filterFecha}
            onChange={e => setFilterFecha(e.target.value)}
          >
            <option value="todos">Cualquier fecha</option>
            <option value="hoy">Últimas 24 horas</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="30dias">Últimos 30 días</option>
          </select>
        </div>

        {/* Botón Refrescar */}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={cargarLogs}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            height: 38,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'pr-refresh--spin' : ''} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* 4. TABLA EXPANDIDA DE LOGS DE AUDITORÍA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px', background: 'var(--surface)' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="pr-refresh--spin" style={{ margin: '0 auto 12px', display: 'block', color: '#2563EB' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Cargando registros de auditoría...</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Obteniendo trazabilidad segura desde la base de datos</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Filter size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              No se encontraron registros de auditoría
            </div>
            <div style={{ fontSize: 12.5, marginTop: 4, maxWidth: 380, margin: '6px auto 0' }}>
              Prueba cambiando los términos de búsqueda o quitando los filtros de acción y módulo.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{
                position: 'sticky',
                top: 0,
                background: 'var(--surface)',
                borderBottom: '2px solid var(--border)',
                textAlign: 'left',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                zIndex: 10,
              }}>
                <th style={{ padding: '12px 10px', width: '17%' }}>Fecha y Hora</th>
                <th style={{ padding: '12px 10px', width: '22%' }}>Usuario Responsable</th>
                <th style={{ padding: '12px 10px', width: '14%' }}>Acción Realizada</th>
                <th style={{ padding: '12px 10px', width: '13%' }}>Módulo</th>
                <th style={{ padding: '12px 10px', width: '34%' }}>Detalles de la Operación</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log, idx) => {
                const { fechaStr, horaStr, relativa } = formatFechaYHora(log.created_at)
                const actUpper = (log.accion || '').toUpperCase()
                const accionConfig = ACCIONES_CONFIG[actUpper] || {
                  label: log.accion || 'ACCION',
                  bg: 'var(--info-bg, #F1F5F9)',
                  color: 'var(--info-text, #334155)',
                  border: 'var(--border, #CBD5E1)',
                  icon: Activity,
                }
                const AccionIcon = accionConfig.icon || Activity

                const tablaNorm = (log.tabla || 'sistema').toLowerCase()
                const moduloConfig = MODULOS_MAP[tablaNorm] || {
                  label: log.tabla || 'Sistema',
                  icon: FileText,
                  color: '#475569',
                  bg: '#F8FAFC',
                  border: '#E2E8F0',
                }
                const ModuloIcon = moduloConfig.icon || FileText

                const d = log.detalles
                const regId = log.registro_id
                const tieneObjeto = d && typeof d === 'object' && Object.keys(d).length > 0
                const tieneString = typeof d === 'string' && d.trim().length > 0
                const isExpanded = expandedLogId === log.id

                return (
                  <tr
                    key={log.id || idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg, #F8FAFC)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Fecha y Hora */}
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text)' }}>
                        <Clock size={13} color="#64748B" />
                        <span>{fechaStr}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 19 }}>
                        {horaStr} {relativa && <span style={{ color: '#0284C7', fontWeight: 600 }}>• {relativa}</span>}
                      </div>
                    </td>

                    {/* Usuario Responsable */}
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: log.correo_usuario === 'Sistema' ? '#E2E8F0' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                          color: log.correo_usuario === 'Sistema' ? '#475569' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}>
                          {getAvatarInitials(log.correo_usuario)}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{
                            fontWeight: 700,
                            color: 'var(--text)',
                            fontSize: 12,
                            wordBreak: 'break-all',
                          }}>
                            {log.correo_usuario || 'Sistema'}
                          </div>
                          {log.usuario_id && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              UID: {log.usuario_id.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Acción Realizada */}
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: accionConfig.bg,
                        color: accionConfig.color,
                        border: `1px solid ${accionConfig.border}`,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                      }}>
                        <AccionIcon size={13} />
                        <span>{accionConfig.label}</span>
                      </span>
                    </td>

                    {/* Módulo */}
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: moduloConfig.bg,
                        color: moduloConfig.color,
                        border: `1px solid ${moduloConfig.border}`,
                        padding: '3px 9px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        <ModuloIcon size={13} />
                        <span>{moduloConfig.label}</span>
                      </span>
                    </td>

                    {/* Detalles de la Operación */}
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* Chip de ID con botón copiar */}
                          {regId && (
                            <button
                              type="button"
                              onClick={() => handleCopyId(regId)}
                              title="Copiar ID completo del registro"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 7px',
                                borderRadius: 5,
                                border: '1px solid var(--border)',
                                background: 'var(--bg, #F1F5F9)',
                                color: 'var(--text-muted)',
                                fontSize: 10.5,
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                              }}
                            >
                              {idCopiado === regId ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
                              <span>ID: {regId.slice(0, 8)}...</span>
                            </button>
                          )}

                          {/* Casos frecuentes formateados con etiquetas claras */}
                          {tieneObjeto && d.descripcion && (
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {d.descripcion}
                            </span>
                          )}

                          {tieneObjeto && d.empleado && (
                            <span style={{
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}>
                              👤 Colaborador: {d.empleado}
                            </span>
                          )}

                          {tieneObjeto && d.concepto && (
                            <span style={{
                              background: '#F1F5F9',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                            }}>
                              📝 {d.concepto}
                            </span>
                          )}

                          {tieneObjeto && d.nombre && (
                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {d.nombre} {d.documento ? `(Doc: ${d.documento})` : ''}
                            </span>
                          )}

                          {tieneObjeto && d.cargo && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Cargo: <strong>{d.cargo}</strong>
                            </span>
                          )}

                          {tieneObjeto && d.campo && (
                            <span style={{ fontSize: 11, color: 'var(--text)' }}>
                              Modificó campo <code>{d.campo}</code> ➔ <strong>{String(d.nuevo_valor)}</strong>
                            </span>
                          )}

                          {tieneObjeto && d.fecha_retiro && (
                            <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 700 }}>
                              Retiro: {d.fecha_retiro}
                            </span>
                          )}

                          {tieneString && (
                            <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                              {d}
                            </span>
                          )}

                          {!tieneObjeto && !tieneString && (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>
                              Acción ejecutada sobre el registro
                            </span>
                          )}

                          {/* Botón Ver / Ocultar JSON */}
                          {tieneObjeto && (
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              style={{
                                marginLeft: 'auto',
                                background: isExpanded ? '#EFF6FF' : 'transparent',
                                border: '1px solid',
                                borderColor: isExpanded ? '#BFDBFE' : 'transparent',
                                borderRadius: 5,
                                padding: '2px 6px',
                                color: '#2563EB',
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isExpanded ? <EyeOff size={11} /> : <Eye size={11} />}
                              <span>{isExpanded ? 'Ocultar JSON' : 'Ver JSON'}</span>
                            </button>
                          )}
                        </div>

                        {/* Visor expandido de JSON con resaltado */}
                        {isExpanded && tieneObjeto && (
                          <pre style={{
                            margin: '4px 0 0 0',
                            padding: '10px 14px',
                            background: '#0F172A',
                            color: '#38BDF8',
                            borderRadius: 8,
                            fontSize: 11,
                            fontFamily: 'Consolas, Monaco, monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: 180,
                            overflowY: 'auto',
                            border: '1px solid #1E293B',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                          }}>
                            {JSON.stringify(d, null, 2)}
                          </pre>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. FOOTER CON PAGINACIÓN Y ESTADÍSTICAS */}
      <div style={{
        padding: '14px 28px',
        background: 'var(--bg, #F8FAFC)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>
            Mostrando <strong>{paginatedLogs.length}</strong> de <strong>{filteredLogs.length}</strong> registros filtrados (Total en base: {logs.length})
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Ver:</span>
            <select
              className="form-control"
              style={{ width: 75, height: 30, fontSize: 11.5, padding: '2px 6px', borderRadius: 6 }}
              value={tamanoPagina}
              onChange={e => setTamanoPagina(Number(e.target.value))}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Controles de Paginación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                style={{
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 11.5,
                  cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                  opacity: pagina === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600, padding: '0 4px' }}>
                Pág. {pagina} de {totalPaginas}
              </span>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                style={{
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 11.5,
                  cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                  opacity: pagina === totalPaginas ? 0.5 : 1,
                }}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{
              padding: '7px 20px',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
