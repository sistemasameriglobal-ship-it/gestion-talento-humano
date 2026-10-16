import { useState, useEffect, useCallback } from 'react'
import * as departamentosApi from '../../api/departamentos'
import { useCompany } from '../../context/CompanyContext'
import {
  Plus, X, Check, Trash2, Edit2,
  AlertCircle, CheckCircle2, Loader2, Layers,
} from 'lucide-react'

export default function ModalGestionDepartamentos({ onClose }) {
  const { reloadDepartamentos, empresasDisponibles, currentCompany } = useCompany()
  const [empresaFiltro, setEmpresaFiltro] = useState(() => currentCompany || 'ameriglobal')
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)

  // Formulario nuevo / edición
  const [modo, setModo] = useState('list') // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await departamentosApi.listarTodosLosDepartamentos(empresaFiltro)
    if (!error) {
      setDepartamentos(data || [])
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
    setCodigo('')
    setEditingId(null)
    setModo('add')
  }

  const handleOpenEdit = (dep) => {
    setNombre(dep.nombre)
    setCodigo(dep.codigo || '')
    setEditingId(dep.id)
    setModo('edit')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return flash('error', 'Ingresa el nombre del departamento.')

    setSaving(true)
    try {
      if (modo === 'add') {
        const { error } = await departamentosApi.crearDepartamento({
          nombre: nombre.trim().toUpperCase(),
          codigo: codigo.trim() || null,
          empresa: empresaFiltro,
          activo: true,
        })
        if (error) throw error
        flash('success', `Departamento "${nombre.trim().toUpperCase()}" agregado a ${empresaFiltro === 'global_link' ? 'Global Link' : 'AmeriGlobal'}.`)
      } else {
        const { error } = await departamentosApi.actualizarDepartamento(editingId, {
          nombre: nombre.trim().toUpperCase(),
          codigo: codigo.trim() || null,
        })
        if (error) throw error
        flash('success', 'Departamento actualizado.')
      }

      setModo('list')
      setNombre('')
      setCodigo('')
      await cargar()
      reloadDepartamentos()
    } catch (err) {
      flash('error', err.message || 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (dep) => {
    const { error } = await departamentosApi.alternarEstadoDepartamento(dep.id, !dep.activo)
    if (error) return flash('error', 'Error al cambiar estado: ' + error.message)
    flash('success', `Departamento "${dep.nombre}" ${!dep.activo ? 'activado' : 'desactivado'}.`)
    await cargar()
    reloadDepartamentos()
  }

  const handleEliminar = async (dep) => {
    if (!window.confirm(`¿Estás seguro de eliminar el departamento "${dep.nombre}"?`)) return
    const { error } = await departamentosApi.eliminarDepartamento(dep.id)
    if (error) return flash('error', 'Error al eliminar: ' + error.message)
    flash('success', `Departamento "${dep.nombre}" eliminado.`)
    await cargar()
    reloadDepartamentos()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            Gestión de Departamentos y Áreas
          </h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {msg && (
            <div className={`alert alert-${msg.type}`} style={{ marginBottom: 14 }}>
              {msg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />} {msg.text}
            </div>
          )}

          {/* Selector de empresa a gestionar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {(empresasDisponibles || []).map(emp => {
                const empCode = emp.codigo || emp.id
                const isSelected = empresaFiltro === empCode
                return (
                  <button
                    key={empCode}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: isSelected ? (emp.colorPrincipal || '#2563EB') : 'transparent',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                    onClick={() => { setEmpresaFiltro(empCode); setModo('list') }}
                  >
                    <span>{emp.icono || '🏢'}</span>
                    <span>{emp.nombre}</span>
                  </button>
                )
              })}
            </div>

            {modo === 'list' && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={14} /> Nuevo Departamento
              </button>
            )}
          </div>

          {/* Modo Formulario (Agregar / Editar) */}
          {modo !== 'list' ? (
            <form onSubmit={handleSave} style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>
                {modo === 'add' ? '➕ Agregar Departamento a ' : '✏️ Editar Departamento en '}
                {empresaFiltro === 'global_link' ? 'Global Link' : 'AmeriGlobal'}
              </h3>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Nombre del Departamento *</label>
                <input
                  className="form-control"
                  placeholder="Ej: COBRANZA, VENTAS, OPERACIONES..."
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Código o Abreviatura (opcional)</label>
                <input
                  className="form-control"
                  placeholder="Ej: COB, VEN, OPE..."
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModo('list')} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                  {saving ? 'Guardando...' : (modo === 'add' ? 'Crear Departamento' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          ) : null}

          {/* Lista de Departamentos */}
          {loading ? (
            <div className="empty-state"><p>Cargando departamentos...</p></div>
          ) : departamentos.length === 0 ? (
            <div className="empty-state">
              <p>No hay departamentos registrados para {empresaFiltro === 'global_link' ? 'Global Link' : 'AmeriGlobal'}.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleOpenAdd}>
                <Plus size={13} /> Crear el primer departamento
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
              <table>
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th>Código</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.map(dep => (
                    <tr key={dep.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span>🏢</span> {dep.nombre}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {dep.codigo || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${dep.activo ? 'pill-ok' : 'pill-pending'}`}>
                          {dep.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Editar nombre"
                            onClick={() => handleOpenEdit(dep)}
                            style={{ padding: '4px 6px' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title={dep.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggleActivo(dep)}
                            style={{ padding: '4px 6px', color: dep.activo ? '#D97706' : '#16A34A' }}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Eliminar departamento"
                            onClick={() => handleEliminar(dep)}
                            style={{ padding: '4px 6px', color: '#DC2626' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 14 }}>
            💡 Los departamentos activos aparecerán automáticamente en los formularios de Empleados, Novedades y filtros de la empresa seleccionada.
          </p>
        </div>
      </div>
    </div>
  )
}
