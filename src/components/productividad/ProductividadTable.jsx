import { useState, useMemo, useCallback } from 'react'
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Eye, Pencil, Trash2, Loader2, ShieldAlert, FileSpreadsheet } from 'lucide-react'
import { MESES_FULL } from '../../utils/productividadConstants'
import { iniciales, fmtFecha, noHabiaIngresado } from '../../utils/productividadHelpers'
import PctBar from './PctBar'
import { exportarExcel } from '../../utils/exportarExcel'
import { exportarProductividadClientesExcel } from '../../utils/productividadExport'
import { filasExportClientes } from '../../utils/productividadImport'
import ImportExportProductividad from './ImportExportProductividad'

function ThOrdenable({ col, children, center, wrap, ordenCol, ordenDir, onToggle }) {
  return (
    <th className={`${center ? 'pr-th-center' : ''} ${wrap ? 'pr-th-wrap' : ''}`} onClick={() => onToggle(col)}>
      <span className="pr-th-inner">
        {children}
        {ordenCol === col
          ? (ordenDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
          : <ArrowUpDown size={11} style={{ opacity: .4 }} />}
      </span>
    </th>
  )
}

export default function ProductividadTable({
  cfg, datos, filas, datosCrudos, anioActivo, mesFiltroIdx, statsPeriodo,
  busqueda, setBusqueda, filtroCargo, setFiltroCargo, cargosUnicos,
  mesFiltro, setMesFiltro,
  ordenCol, ordenDir, toggleOrden,
  eliminandoNombre, importarFilas,
  abrirVer, abrirEditar, eliminarPersona, setVerProcesos,
}) {
  const [exportando, setExportando] = useState(false)

  // Para "Importar Excel": empleados activos de la sección y lo ya guardado (cualquier año cargado)
  const nombresEmpleados = useMemo(() => datosCrudos.map(p => p.nombre), [datosCrudos])
  const existentesClientes = useCallback((nombre, anio, mes) => {
    const p = datosCrudos.find(x => x.nombre === nombre)
    const i = MESES_FULL.indexOf(mes)
    const asignados = p?.asignadosPorAnio?.[anio]?.[i] || 0
    const resueltos = p?.resueltosPorAnio?.[anio]?.[i] || 0
    return asignados || resueltos ? { asignados, resueltos } : null
  }, [datosCrudos])

  async function handleExportar() {
    if (exportando) return
    setExportando(true)
    try {
      const hoy = new Date().toISOString().slice(0, 10)

      if (cfg.usaClientes) {
        // Dos hojas: consolidado del año + detalle mes a mes (asignados, resueltos y %)
        await exportarProductividadClientesExcel({ cfg, anio: anioActivo, filas })
        return
      }

      const datosExport = filas.map(v => {
        const row = {
          'Posición': v.rank,
          [cfg.personaLabel]: v.nombre,
          'Cargo': v.cargo || '—',
          'Fecha Ingreso': fmtFecha(v.ingreso),
        }
        MESES_FULL.forEach((m, idx) => {
          row[m] = v.resueltos[idx] || 0
        })
        row['Total Anual'] = v.totalResueltos
        row['Procesos Disciplinarios'] = v.procesos?.length || 0
        return row
      })

      await exportarExcel(datosExport, {
        nombreHoja: `${cfg.tabLabel} ${anioActivo}`,
        nombreArchivo: `Productividad_${cfg.tabLabel}_${anioActivo}_${hoy}.xlsx`,
        titulo: `Productividad — ${cfg.tabLabel} (${anioActivo})`,
      })
    } catch (err) {
      console.error(err)
      alert('Error al exportar: ' + (err.message || 'Desconocido'))
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="pr-card">
      <div className="pr-toolbar">
        <div className="pr-search">
          <Search size={14} className="pr-search-icon" />
          <input
            className="pr-search-input"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select className="pr-select" value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}>
          <option value="todos">Todos los cargos</option>
          {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="pr-select" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
          <option value="todos">Todos los meses</option>
          {MESES_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <button
          className="pr-btn pr-btn--excel"
          style={{ padding: '7px 14px', fontSize: 12 }}
          onClick={handleExportar}
          disabled={exportando || filas.length === 0}
          title="Exportar tabla a Excel"
        >
          {exportando ? <Loader2 size={13} className="pr-refresh--spin" /> : <FileSpreadsheet size={13} />}
          {exportando ? 'Exportando…' : 'Exportar Excel'}
        </button>
        {cfg.usaClientes && importarFilas && (
          <ImportExportProductividad
            modo="clientes"
            etiqueta={cfg.tabLabel}
            anio={anioActivo}
            nombres={nombresEmpleados}
            filasExport={() => filasExportClientes(datos, anioActivo)}
            existentes={existentesClientes}
            onImportar={importarFilas}
          />
        )}
        <span className="pr-count">{filas.length} de {datos.length}</span>
      </div>

      <div className="pr-table-scroll">
        <table className="pr-table">
          <thead>
            <tr>
              <th className="pr-th-num">#</th>
              <ThOrdenable col="nombre" ordenCol={ordenCol} ordenDir={ordenDir} onToggle={toggleOrden}>{cfg.personaLabel}</ThOrdenable>
              <ThOrdenable col="cargo" ordenCol={ordenCol} ordenDir={ordenDir} onToggle={toggleOrden}>Cargo</ThOrdenable>
              <th>{cfg.usaClientes ? 'Resueltos (Ene→Dic)' : 'Tendencia (Ene→Dic)'}</th>
              {cfg.usaClientes ? (
                <>
                  <ThOrdenable col="asignados" center wrap ordenCol={ordenCol} ordenDir={ordenDir} onToggle={toggleOrden}>Clientes asignados</ThOrdenable>
                  <ThOrdenable col="resueltos" center wrap ordenCol={ordenCol} ordenDir={ordenDir} onToggle={toggleOrden}>Clientes resueltos</ThOrdenable>
                  <ThOrdenable col="pct" center ordenCol={ordenCol} ordenDir={ordenDir} onToggle={toggleOrden}>% Resolución</ThOrdenable>
                </>
              ) : (
                <ThOrdenable col="resueltos" ordenCol={ordenCol} ordenDir={ordenDir} onToggle={toggleOrden}>{mesFiltroIdx >= 0 ? MESES_FULL[mesFiltroIdx] : 'Total'}</ThOrdenable>
              )}
              <th className="pr-th-num">Disciplinario</th>
              <th className="pr-th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={cfg.usaClientes ? 9 : 7} className="pr-empty">
                {datos.length === 0
                  ? `No hay empleados activos con dependencia ${cfg.dependenciaEmpleados} (${cfg.tabLabel}). Agrégalos o actívalos en la sección Empleados.`
                  : 'No se encontraron resultados para tu búsqueda.'}
              </td></tr>
            ) : filas.map(v => {
              const maxRow = Math.max(...v.resueltos, 1)
              const st = statsPeriodo(v)
              const sinIngresoPeriodo = mesFiltroIdx >= 0 && noHabiaIngresado(v, MESES_FULL[mesFiltroIdx], anioActivo)
              return (
                <tr key={v.nombre}>
                  <td>
                    <span className={`pr-rank pr-rank--${v.rank <= 3 ? v.rank : ''}`}>{v.rank}</span>
                  </td>
                  <td>
                    <div className="pr-person">
                      <div className="pr-person-avatar">{iniciales(v.nombre)}</div>
                      <div>
                        <div className="pr-person-name">{v.nombre}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Ingreso: {fmtFecha(v.ingreso)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`pr-cargo-badge ${v.cargo.toLowerCase().includes('supervisor') ? 'pr-cargo-badge--sup' : ''}`}>
                      {v.cargo || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="pr-spark" title={v.resueltos.join(' · ')} onClick={() => abrirVer(v)}>
                      {v.resueltos.map((m, i) => {
                        const sinIngreso = noHabiaIngresado(v, MESES_FULL[i], anioActivo)
                        return (
                          <div
                            key={i}
                            className={`pr-spark-bar ${sinIngreso ? 'pr-spark-bar--na' : (m === maxRow && m > 0 ? 'pr-spark-bar--peak' : '')}`}
                            style={{ height: sinIngreso ? '100%' : `${Math.max((m / maxRow) * 100, 6)}%` }}
                          />
                        )
                      })}
                    </div>
                  </td>
                  {cfg.usaClientes ? (
                    sinIngresoPeriodo ? (
                      <td colSpan={3} style={{ textAlign: 'center' }}>
                        <span className="ci-na-cell" title={`Ingresó el ${fmtFecha(v.ingreso)}`}>N/A</span>
                      </td>
                    ) : (
                      <>
                        <td className="pr-num-cell pr-num-cell--muted">{st.asig.toLocaleString('es-CO')}</td>
                        <td className="pr-num-cell">{st.resu.toLocaleString('es-CO')}</td>
                        <td className="pr-pct-wrap"><PctBar value={st.pct} /></td>
                      </>
                    )
                  ) : (
                    <td>
                      {sinIngresoPeriodo
                        ? <span className="ci-na-cell" title={`Ingresó el ${fmtFecha(v.ingreso)}`}>N/A</span>
                        : <span className="pr-total-cell">{st.resu}</span>}
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    {(v.procesos?.length || 0) > 0 ? (
                      <button
                        className="pr-flag pr-flag--warn"
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        title="Ver procesos disciplinarios"
                        onClick={() => setVerProcesos(datosCrudos.find(p => p.nombre === v.nombre))}
                      >
                        <ShieldAlert size={12} /> {v.procesos.length}
                      </button>
                    ) : (
                      <span className="pr-flag pr-flag--ok">0</span>
                    )}
                  </td>
                  <td>
                    <div className="pr-actions">
                      <button className="pr-icon-btn" title="Ver detalle" onClick={() => abrirVer(v)}>
                        <Eye size={13} />
                      </button>
                      {abrirEditar && (
                        <button className="pr-icon-btn" title="Editar" onClick={() => abrirEditar(v)}>
                          <Pencil size={13} />
                        </button>
                      )}
                      {eliminarPersona && cfg.id !== 'ventas' && (
                        <button
                          className="pr-icon-btn pr-icon-btn--danger"
                          title="Reiniciar historial a 0"
                          disabled={eliminandoNombre === v.nombre}
                          onClick={() => eliminarPersona(v.nombre)}
                        >
                          {eliminandoNombre === v.nombre ? <Loader2 size={13} /> : <Trash2 size={13} />}
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
