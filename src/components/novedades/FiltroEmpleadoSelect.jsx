// =============================================================
// src/components/novedades/FiltroEmpleadoSelect.jsx
// -------------------------------------------------------------
// Dropdown/Combobox con buscador interno (ignora mayúsculas y acentos)
// para filtrar por colaborador en la barra de herramientas de Novedades.
// =============================================================
import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, ChevronDown, X, User } from 'lucide-react'

// Normaliza texto eliminando acentos y espacios extra para búsqueda flexible
const normalizar = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export default function FiltroEmpleadoSelect({
  value,
  onChange,
  empleados = [],
  placeholder = 'Todos los empleados',
}) {
  const [open, setOpen] = useState(false)
  const [terminoBusquedaMenu, setTerminoBusquedaMenu] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Cerrar al hacer clic fuera del contenedor
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setTerminoBusquedaMenu('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Empleado seleccionado actualmente
  const empleadoSeleccionado = useMemo(() => {
    if (!value || value === 'Todos') return null
    return empleados.find(e => String(e.id) === String(value) || e.nombre_completo === value)
  }, [value, empleados])

  // Filtrado de la lista por término de búsqueda (insensible a mayúsculas y acentos)
  const empleadosFiltrados = useMemo(() => {
    const q = normalizar(terminoBusquedaMenu)
    if (!q) return empleados
    return empleados.filter(emp => {
      const matchNombre = normalizar(emp.nombre_completo).includes(q)
      const matchDoc = emp.numero_documento && String(emp.numero_documento).includes(q)
      return matchNombre || matchDoc
    })
  }, [empleados, terminoBusquedaMenu])

  const handleSelect = (empId) => {
    onChange(empId)
    setOpen(false)
    setTerminoBusquedaMenu('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setOpen(false)
    setTerminoBusquedaMenu('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '1 1 190px', minWidth: 160, maxWidth: 220 }}>
      {/* Botón disparador principal */}
      <button
        type="button"
        className="form-control"
        onClick={() => {
          setOpen(prev => !prev)
          setTerminoBusquedaMenu('')
        }}
        title={empleadoSeleccionado ? empleadoSeleccionado.nombre_completo : placeholder}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '0 10px',
          height: 35,
          cursor: 'pointer',
          textAlign: 'left',
          background: 'var(--surface)',
          border: empleadoSeleccionado ? '1px solid var(--primary, #2563EB)' : '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: empleadoSeleccionado ? 600 : 500,
          color: empleadoSeleccionado ? 'var(--text)' : 'var(--text-muted)',
          boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {empleadoSeleccionado ? (
            <>
              <User size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {empleadoSeleccionado.nombre_completo}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
          )}
        </span>

        {empleadoSeleccionado ? (
          <span
            onClick={handleClear}
            title="Quitar filtro de empleado"
            style={{
              padding: 2,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'background .15s, color .15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg)'
              e.currentTarget.style.color = 'var(--danger-text, #DC2626)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown
            size={13}
            style={{
              flexShrink: 0,
              opacity: 0.6,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        )}
      </button>

      {/* Menú desplegable flotante */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 'max-content',
            minWidth: 260,
            maxWidth: 320,
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Input de búsqueda interno */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={inputRef}
              value={terminoBusquedaMenu}
              onChange={e => setTerminoBusquedaMenu(e.target.value)}
              placeholder="Buscar por nombre o cédula..."
              style={{
                width: '100%',
                padding: '6px 26px 6px 26px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12.5,
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {terminoBusquedaMenu && (
              <button
                type="button"
                onClick={() => setTerminoBusquedaMenu('')}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lista de opciones con scroll */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {/* Opción fija: Todos los empleados */}
            <div
              onClick={() => handleSelect('')}
              style={{
                padding: '8px 14px',
                fontSize: 12.5,
                cursor: 'pointer',
                borderBottom: '1px dashed var(--border)',
                color: !value || value === 'Todos' ? 'var(--primary)' : 'var(--text-muted)',
                background: !value || value === 'Todos' ? 'var(--primary-light, #EFF6FF)' : 'transparent',
                fontWeight: !value || value === 'Todos' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => {
                if (value && value !== 'Todos') e.currentTarget.style.background = 'var(--bg)'
              }}
              onMouseLeave={e => {
                if (value && value !== 'Todos') e.currentTarget.style.background = 'transparent'
              }}
            >
              <span>👥 Todos los empleados</span>
              {(!value || value === 'Todos') && <span style={{ fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>

            {/* Listado filtrado */}
            {empleadosFiltrados.length === 0 ? (
              <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No se encontraron resultados
              </div>
            ) : (
              empleadosFiltrados.map(emp => {
                const isSelected = String(value) === String(emp.id) || value === emp.nombre_completo
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp.id)}
                    style={{
                      padding: '7px 14px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      background: isSelected ? 'var(--primary-light, #EFF6FF)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text)',
                      fontWeight: isSelected ? 700 : 400,
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.nombre_completo}
                      </div>
                      {emp.numero_documento && (
                        <div style={{ fontSize: 11, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', opacity: 0.85 }}>
                          CC {emp.numero_documento}
                        </div>
                      )}
                    </div>
                    {isSelected && <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
