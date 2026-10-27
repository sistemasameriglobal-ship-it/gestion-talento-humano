import { useState, useEffect, useCallback, useMemo } from 'react'
import * as cargosApi from '../../api/cargos'
import { useCompany } from '../../context/CompanyContext'
import {
  Plus, X, Check, Trash2, Edit2,
  AlertCircle, CheckCircle2, Loader2, Briefcase, Search, Building2
} from 'lucide-react'

export default function ModalGestionCargos({ onClose }) {
  const { reloadCargos, empresasDisponibles, currentCompany } = useCompany()
  const [empresaFiltro, setEmpresaFiltro] = useState(() => currentCompany || 'ameriglobal')
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  // Formulario nuevo / edición
  const [modo, setModo] = useState('list') // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await cargosApi.listarTodosLosCargos(empresaFiltro)
    if (!error) {
      setCargos(data || [])
    }
    setLoading(false)
  }, [empresaFiltro])

  useEffect(() => {
    Promise.resolve().then(() => cargar())
  }, [cargar])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleOpenAdd = () => {
    setNombre('')
    setEditingId(null)
    setModo('add')
  }

  const handleOpenEdit = (c) => {
    setNombre(c.nombre)
    setEditingId(c.id)
    setModo('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return flash('error', 'Ingresa el nombre del cargo.')

    setSaving(true)
    try {
      if (modo === 'add') {
        const { error } = await cargosApi.crearCargo({
          nombre: nombre.trim().toUpperCase(),
          empresa: empresaFiltro,
          activo: true,
        })
        if (error) throw error
        flash('success', `Cargo "${nombre.trim().toUpperCase()}" agregado exitosamente.`)
      } else {
        const { error } = await cargosApi.actualizarCargo(editingId, {
          nombre: nombre.trim().toUpperCase(),
        })
        if (error) throw error
        flash('success', 'Cargo actualizado exitosamente.')
      }

      setModo('list')
      setNombre('')
      await cargar()
      if (typeof reloadCargos === 'function') reloadCargos()
    } catch (err) {
      flash('error', err.message || 'No se pudo guardar el cargo.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (c) => {
    const nuevoEstado = !c.activo
    const { error } = await cargosApi.alternarEstadoCargo(c.id, nuevoEstado)
    if (error) return flash('error', 'Error al cambiar estado: ' + error.message)
    flash('success', `Cargo "${c.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'}.`)
    await cargar()
    if (typeof reloadCargos === 'function') reloadCargos()
  }

  const handleEliminar = async (c) => {
    if (!window.confirm(`¿Estás seguro de eliminar el cargo "${c.nombre}"?`)) return
    const { error } = await cargosApi.eliminarCargo(c.id)
    if (error) return flash('error', 'Error al eliminar: ' + error.message)
    flash('success', `Cargo "${c.nombre}" eliminado.`)
    await cargar()
    if (typeof reloadCargos === 'function') reloadCargos()
  }

  const cargosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return cargos
    return cargos.filter(c =>
      c.nombre?.toLowerCase().includes(q)
    )
  }, [cargos, busqueda])

  const activosCount = useMemo(() => cargos.filter(c => c.activo !== false).length, [cargos])
  const inactivosCount = cargos.length - activosCount

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 740, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Gestión de Cargos y Posiciones</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Configura los cargos disponibles para el registro y movimientos de empleados.
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Mensajes flash */}
        {msg && (
          <div style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: msg.type === 'error' ? '#EF4444' : '#10B981',
            border: `1px solid ${msg.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          }}>
            {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Barra superior de filtros y acciones */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          {/* Selector de empresa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={empresaFiltro}
              onChange={e => {
                setEmpresaFiltro(e.target.value)
                setModo('list')
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {(empresasDisponibles || [{ id: 'ameriglobal', nombre: 'AmeriGlobal' }, { id: 'global_link', nombre: 'Global Link' }]).map(emp => (
                <option key={emp.id || emp.codigo} value={emp.id || emp.codigo}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          {modo === 'list' && (
            <>
              {/* Buscador */}
              <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar cargo..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: 12.5,
                  }}
                />
              </div>

              {/* Botón Agregar */}
              <button
                className="btn btn-primary"
                onClick={handleOpenAdd}
                style={{ padding: '6px 12px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Nuevo Cargo
              </button>
            </>
          )}

          {modo !== 'list' && (
            <button
              className="btn btn-ghost"
              onClick={() => setModo('list')}
              style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12.5 }}
            >
              ← Volver al listado
            </button>
          )}
        </div>

        {/* Contenido principal */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {modo !== 'list' ? (
            /* Formulario Agregar / Editar */
            <form onSubmit={handleSave} style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                {modo === 'add' ? 'Registrar Nuevo Cargo' : 'Editar Cargo'}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  Nombre del Cargo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. ANALISTA DE CRÉDITO / ASESOR SENIOR"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: 13,
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModo('list')}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !nombre.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  {modo === 'add' ? 'Crear Cargo' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          ) : (
            /* Lista de Cargos */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>
                  Total: <strong>{cargos.length}</strong> cargos ({activosCount} activos, {inactivosCount} inactivos)
                </span>
                {busqueda && (
                  <span>Filtrando por: "{busqueda}"</span>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={18} className="spin" />
                  <span>Cargando cargos...</span>
                </div>
              ) : cargosFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                  <Briefcase size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600 }}>No se encontraron cargos</p>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {busqueda ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no se han configurado cargos para esta empresa.'}
                  </p>
                  <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '6px 14px', fontSize: 12.5 }}>
                    <Plus size={14} /> Registrar Primer Cargo
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cargosFiltrados.map(c => {
                    const esActivo = c.activo !== false
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          opacity: esActivo ? 1 : 0.65,
                          transition: 'all .15s ease',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                              {c.nombre}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: esActivo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: esActivo ? '#10B981' : '#EF4444',
                            }}>
                              {esActivo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => handleToggleActivo(c)}
                            title={esActivo ? 'Desactivar cargo' : 'Activar cargo'}
                            style={{ padding: '5px 8px', fontSize: 11 }}
                          >
                            {esActivo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => handleOpenEdit(c)}
                            title="Editar cargo"
                            style={{ padding: '5px 8px' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => handleEliminar(c)}
                            title="Eliminar cargo"
                            style={{ padding: '5px 8px', color: '#EF4444' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>💡 Los cargos activos aparecerán automáticamente como opciones en la ficha de Empleados.</span>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 14px' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
