import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { MESES, MESES_FULL, META_FRIOS_MINIMO } from '../../utils/productividadConstants'
import { calcPct, colorPct, noHabiaIngresado } from '../../utils/productividadHelpers'

const ceros = () => Array(MESES.length).fill(0)
const suma = (arr) => arr.reduce((s, v) => s + (Number(v) || 0), 0)

export default function PersonaModal({ inicial, cfg, persona, onGuardar, onCerrar, guardando, errorGuardado }) {
  const [form, setForm] = useState(() => ({
    ...inicial,
    frios: inicial.frios || ceros(),
  }))

  const totalResueltos = suma(form.resueltos)
  const totalAsignados = suma(form.asignados)
  const totalFrios = suma(form.frios)
  const totalGeneral = totalResueltos + totalFrios
  const pctTotal = calcPct(totalResueltos, totalAsignados)

  const setCampo = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))
  const setMes = (campo, idx, valor) => setForm(f => {
    const arr = [...(f[campo] || ceros())]
    arr[idx] = valor
    return { ...f, [campo]: arr }
  })
  // Al cambiar de año, cargar los valores ya guardados de ese año (o ceros si es nuevo)
  const setAnio = (valor) => setForm(f => {
    const anio = Number(valor)
    const resueltos = persona?.resueltosPorAnio?.[anio]
    const asignados = persona?.asignadosPorAnio?.[anio]
    const frios = persona?.friosPorAnio?.[anio]
    return {
      ...f,
      anio: valor,
      resueltos: resueltos ? [...resueltos] : ceros(),
      asignados: asignados ? [...asignados] : ceros(),
      frios: frios ? [...frios] : ceros(),
    }
  })

  return (
    <div className="pr-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="pr-modal" style={{ maxWidth: cfg.usaClientes ? 780 : 540 }}>
        <div className="pr-modal-head">
          <span className="pr-modal-title">Editar a {inicial.nombre}</span>
          <button className="pr-modal-close" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="pr-modal-body">
          {errorGuardado && <div className="pr-modal-error">{errorGuardado}</div>}

          <div className="pr-field">
            <span className="pr-field-label">Nombre completo</span>
            <input className="pr-input" value={form.nombre} disabled />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Se sincroniza automáticamente desde Empleados ({cfg.tabLabel}). Para cambiarlo, edítalo allá.
            </span>
          </div>

          <div className="pr-field-row">
            <div className="pr-field">
              <span className="pr-field-label">Cargo</span>
              <input
                className="pr-input"
                value={form.cargo}
                onChange={e => setCampo('cargo', e.target.value)}
                placeholder={`${cfg.tabLabel}, Supervisor...`}
              />
            </div>
            <div className="pr-field">
              <span className="pr-field-label">Fecha de ingreso</span>
              <input
                className="pr-input"
                type="date"
                value={form.ingreso}
                onChange={e => setCampo('ingreso', e.target.value)}
              />
            </div>
          </div>

          <div className="pr-field">
            <span className="pr-field-label">Año de los valores mensuales</span>
            <input
              className="pr-input"
              type="number"
              style={{ maxWidth: 140 }}
              value={form.anio}
              onChange={e => setAnio(e.target.value)}
            />
          </div>

          {cfg.usaClientes ? (
            <>
              <div className="pr-field">
                <span className="pr-field-label">Clientes por mes — {form.anio}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  El % de resolución se calcula solo: clientes resueltos ÷ clientes asignados (Meta para cumplir: <b>40%</b>). Los clientes en frío se suman al Total Resueltos General.
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="pr-mes-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Mes</th>
                      <th>Clientes asignados</th>
                      <th>Clientes resueltos</th>
                      <th>% Resolución</th>
                      <th>Clientes en frío (Redes)</th>
                      <th>Total resueltos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MESES.map((m, i) => {
                      const asig = Number(form.asignados[i]) || 0
                      const resu = Number(form.resueltos[i]) || 0
                      const frios = Number(form.frios?.[i]) || 0
                      const totalMes = resu + frios
                      const pct = calcPct(resu, asig)
                      const sinIngreso = noHabiaIngresado(form, MESES_FULL[i], Number(form.anio))
                      return (
                        <tr key={m} style={sinIngreso ? { opacity: .55 } : undefined}>
                          <td title={sinIngreso ? 'Aún no había ingresado' : undefined}>{m}</td>
                          <td>
                            <input
                              className="pr-input"
                              type="number" min="0" step="1"
                              value={form.asignados[i]}
                              onChange={e => setMes('asignados', i, e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="pr-input"
                              type="number" min="0" step="1"
                              value={form.resueltos[i]}
                              onChange={e => setMes('resueltos', i, e.target.value)}
                            />
                          </td>
                          <td>
                            {asig > 0 ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                <b style={{ color: colorPct(pct), fontSize: 12 }}>{pct}%</b>
                                <span style={{
                                  fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                  background: pct >= 40 ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.12)',
                                  color: pct >= 40 ? '#059669' : '#DC2626',
                                }}>
                                  {pct >= 40 ? 'Meta' : 'Bajo'}
                                </span>
                              </div>
                            ) : (
                              <span className="pr-month-pct--empty">—</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <input
                                className="pr-input"
                                type="number" min="0" step="1"
                                style={{
                                  borderColor: frios >= META_FRIOS_MINIMO ? '#10B981' : (frios > 0 ? '#38BDF8' : undefined),
                                  background: frios >= META_FRIOS_MINIMO ? 'rgba(16,185,129,.05)' : (frios > 0 ? 'rgba(56,189,248,.04)' : undefined),
                                }}
                                value={form.frios?.[i] ?? 0}
                                onChange={e => setMes('frios', i, e.target.value)}
                                placeholder="0"
                              />
                              {frios > 0 && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                  background: frios >= META_FRIOS_MINIMO ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                                  color: frios >= META_FRIOS_MINIMO ? '#059669' : '#D97706',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {frios >= META_FRIOS_MINIMO ? `✓ Mín. (${META_FRIOS_MINIMO}+)` : `Faltan ${META_FRIOS_MINIMO - frios}`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontWeight: 800, color: totalMes > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {totalMes}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pr-modal-totals" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <div className="pr-modal-total-box"><span>Asignados {form.anio}</span><b>{totalAsignados.toLocaleString('es-CO')}</b></div>
                <div className="pr-modal-total-box"><span>Resueltos {form.anio}</span><b>{totalResueltos.toLocaleString('es-CO')}</b></div>
                <div className="pr-modal-total-box">
                  <span>% Resolución (Meta 40%)</span>
                  <b style={{ color: totalAsignados > 0 ? colorPct(pctTotal) : undefined }}>
                    {pctTotal}%
                    {totalAsignados > 0 && (
                      <span style={{ fontSize: 10, display: 'block', color: pctTotal >= 40 ? '#059669' : '#DC2626' }}>
                        {pctTotal >= 40 ? '✓ Cumple' : '✕ Bajo meta'}
                      </span>
                    )}
                  </b>
                </div>
                <div className="pr-modal-total-box" style={{ borderColor: '#38BDF8' }}>
                  <span style={{ color: '#0284C7' }}>Clientes en Frío</span>
                  <b style={{ color: '#0284C7' }}>{totalFrios.toLocaleString('es-CO')}</b>
                </div>
                <div className="pr-modal-total-box" style={{ borderColor: 'var(--primary)', background: 'rgba(37, 99, 235, .05)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 800 }}>Total Resueltos General</span>
                  <b style={{ color: 'var(--primary)', fontSize: 20 }}>{totalGeneral.toLocaleString('es-CO')}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="pr-field">
                <span className="pr-field-label">Ventas por mes — {form.anio} (Ene — Dic)</span>
                <div className="pr-months-grid">
                  {MESES.map((m, i) => (
                    <div className="pr-month-field" key={m}>
                      <label>{m}</label>
                      <input
                        className="pr-input"
                        type="number"
                        min="0"
                        value={form.resueltos[i]}
                        onChange={e => setMes('resueltos', i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pr-modal-total">
                <span>Total de {form.anio}</span>
                <b>{totalResueltos}</b>
              </div>
            </>
          )}
        </div>
        <div className="pr-modal-foot">
          <button className="pr-btn pr-btn--ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button
            className="pr-btn pr-btn--primary"
            disabled={guardando || !form.nombre.trim()}
            onClick={() => onGuardar(form)}
          >
            {guardando ? <Loader2 size={14} /> : null}
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
