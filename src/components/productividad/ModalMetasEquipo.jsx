import { useState, useEffect, useMemo } from 'react'
import { Target, X, Check, Loader2, Sparkles, Calculator, Copy, ArrowRight, TrendingUp } from 'lucide-react'
import AnimatedModal from '../ui/AnimatedModal'
import { MESES, MESES_FULL } from '../../utils/productividadConstants'
import { guardarMetasEquipo } from '../../api/productividad'

export default function ModalMetasEquipo({
  open,
  onClose,
  cfg,
  anio,
  currentCompany,
  metasConfig,
  monthlyTotals = [],
  onSave,
  mesFiltroIdx = -1,
}) {
  const [mensuales, setMensuales] = useState(Array(12).fill(100))
  const [metaAnual, setMetaAnual] = useState(1200)
  const [valorUnificado, setValorUnificado] = useState('100')
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(false)

  // Cargar estado inicial desde metasConfig
  useEffect(() => {
    if (open && metasConfig) {
      const arr = (metasConfig.mensuales && metasConfig.mensuales.length === 12)
        ? [...metasConfig.mensuales]
        : Array(12).fill(metasConfig.metaBase || 100)
      setMensuales(arr)
      const suma = arr.reduce((s, v) => s + v, 0)
      setMetaAnual(metasConfig.anual || (suma > 0 ? suma : 1200))
      setValorUnificado(String(arr[0] || metasConfig.metaBase || 100))
      setMensajeExito(false)
    }
  }, [open, metasConfig])

  // Suma en vivo de los 12 meses
  const sumaMeses = useMemo(() => mensuales.reduce((s, v) => s + (Number(v) || 0), 0), [mensuales])

  // Total anual alcanzado real
  const totalRealAnual = useMemo(() => monthlyTotals.reduce((s, v) => s + (Number(v) || 0), 0), [monthlyTotals])
  const pctAnual = metaAnual > 0 ? Math.round((totalRealAnual / metaAnual) * 100) : 0

  const handleMesChange = (idx, valor) => {
    const val = Math.max(0, parseInt(valor, 10) || 0)
    setMensuales(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }

  // Distribuir meta anual equitativamente entre los 12 meses
  const handleDistribuirEquitativo = () => {
    const cadaMes = Math.max(1, Math.round(metaAnual / 12))
    setMensuales(Array(12).fill(cadaMes))
  }

  // Sumar automáticamente los 12 meses y actualizar la meta anual
  const handleSumarMeses = () => {
    setMetaAnual(sumaMeses)
  }

  // Copiar valor unificado a todos los meses
  const handleAplicarATodos = () => {
    const num = Math.max(0, parseInt(valorUnificado, 10) || 0)
    if (num <= 0) return
    setMensuales(Array(12).fill(num))
    setMetaAnual(num * 12)
  }

  // Guardar en Supabase y localmente
  const handleGuardar = async (e) => {
    e?.preventDefault()
    setGuardando(true)
    try {
      const guardado = await guardarMetasEquipo({
        departamento: cfg.id,
        anio,
        empresa: currentCompany,
        mensuales,
        anual: metaAnual,
      })
      if (onSave) onSave(guardado)
      setMensajeExito(true)
      setTimeout(() => {
        setMensajeExito(false)
        onClose()
      }, 700)
    } catch (err) {
      console.error('Error al guardar metas:', err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AnimatedModal open={open} onRequestClose={onClose}>
      <div style={{ maxWidth: 860, width: '100%', padding: '24px 28px' }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
              color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 20%, transparent)'
            }}>
              <Target size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                  Asignar Metas del Equipo
                </h3>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: 'var(--primary-light, #EFF6FF)', color: 'var(--primary, #2563EB)',
                  border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)'
                }}>
                  {cfg.tabLabel} · Año {anio}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                Configura los objetivos mensuales mes a mes y la meta global anual de clientes cerrados.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pr-btn pr-btn--outline"
            style={{ padding: 6, borderRadius: 8 }}
            onClick={onClose}
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── SECCIÓN 1: META ANUAL ── */}
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid color-mix(in srgb, var(--primary) 30%, var(--border))',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--primary)', display: 'block', marginBottom: 4
              }}>
                🎯 Objetivo Global del Año
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  Meta Anual ({anio}):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={metaAnual}
                    onChange={e => setMetaAnual(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    style={{
                      width: 130, padding: '6px 12px', fontSize: 16, fontWeight: 800,
                      borderRadius: 8, border: '2px solid var(--primary)',
                      background: 'var(--bg)', color: 'var(--text)', textAlign: 'center'
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>clientes cerrados</span>
                </div>
              </div>
            </div>

            {/* Accesos rápidos anuales */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pr-btn pr-btn--outline"
                style={{ fontSize: 11.5, padding: '6px 12px', gap: 5 }}
                onClick={handleDistribuirEquitativo}
                title="Divide la meta anual en 12 partes iguales y las aplica a cada mes"
              >
                <Sparkles size={13} color="var(--primary)" />
                Distribuir en los 12 meses (~{Math.round(metaAnual / 12)}/mes)
              </button>
              <button
                type="button"
                className="pr-btn pr-btn--outline"
                style={{ fontSize: 11.5, padding: '6px 12px', gap: 5 }}
                onClick={handleSumarMeses}
                title="Ajusta la meta anual a la suma de los valores ingresados en los 12 meses"
              >
                <Calculator size={13} color="#059669" />
                Igualar a suma de meses ({sumaMeses})
              </button>
            </div>
          </div>

          {/* Barra de progreso anual actual */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, marginBottom: 5 }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Progreso real acumulado en {anio}: <b style={{ color: 'var(--text)' }}>{totalRealAnual.toLocaleString('es-CO')}</b> de {metaAnual.toLocaleString('es-CO')} cerrados
              </span>
              <span style={{ fontWeight: 800, color: pctAnual >= 100 ? '#059669' : (pctAnual >= 70 ? 'var(--primary)' : '#D97706') }}>
                {pctAnual}% alcanzado en el año
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(pctAnual, 100)}%`,
                background: pctAnual >= 100 ? '#10B981' : (pctAnual >= 70 ? 'var(--primary)' : '#F59E0B'),
                transition: 'width .3s'
              }} />
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: METAS POR MES ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', display: 'block' }}>
                Metas Mensuales (Mes a Mes)
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Personaliza la meta de cada mes según estacionalidad o proyecciones del equipo.
              </span>
            </div>

            {/* Asignación rápida unificada */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>Copiar a todos:</span>
              <input
                type="number"
                min="1"
                step="1"
                value={valorUnificado}
                onChange={e => setValorUnificado(e.target.value)}
                style={{
                  width: 75, padding: '4px 8px', fontSize: 12, fontWeight: 700,
                  borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center',
                  background: 'var(--bg)', color: 'var(--text)'
                }}
                placeholder="100"
              />
              <button
                type="button"
                className="pr-btn pr-btn--outline"
                style={{ fontSize: 11, padding: '4px 9px', gap: 4 }}
                onClick={handleAplicarATodos}
                title="Aplica este valor a los 12 meses"
              >
                <Copy size={11} />
                Aplicar
              </button>
            </div>
          </div>

          {/* Grid de los 12 meses */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 10
          }}>
            {MESES.map((mesCorto, idx) => {
              const metaMes = mensuales[idx] || 0
              const realMes = monthlyTotals[idx] || 0
              const pctMes = metaMes > 0 ? Math.round((realMes / metaMes) * 100) : 0
              const esMesSeleccionado = mesFiltroIdx === idx

              return (
                <div
                  key={mesCorto}
                  style={{
                    background: esMesSeleccionado ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--surface)',
                    border: esMesSeleccionado ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>
                        {MESES_FULL[idx]}
                      </span>
                      {esMesSeleccionado && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, background: 'var(--primary)', color: '#fff',
                          padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase'
                        }}>
                          Vista
                        </span>
                      )}
                    </div>
                    {realMes > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: pctMes >= 100 ? '#059669' : (pctMes >= 70 ? 'var(--primary)' : '#D97706')
                      }}>
                        {pctMes}%
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Meta:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={metaMes}
                      onChange={e => handleMesChange(idx, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text)'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: 'var(--text-muted)' }}>
                    <span>Real: <b style={{ color: 'var(--text)' }}>{realMes}</b> cerrados</span>
                    {realMes > 0 && (
                      <span style={{ fontSize: 9.5 }}>
                        {realMes >= metaMes ? '✓ Cumplida' : `Faltan ${Math.max(0, metaMes - realMes)}`}
                      </span>
                    )}
                  </div>

                  {metaMes > 0 && (
                    <div style={{ height: 3, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pctMes, 100)}%`,
                        background: pctMes >= 100 ? '#10B981' : (pctMes >= 70 ? 'var(--primary)' : '#F59E0B')
                      }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RESUMEN EN VIVO Y DIFERENCIA ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
            <span>
              Suma de los 12 meses: <b style={{ color: 'var(--text)', fontSize: 13 }}>{sumaMeses.toLocaleString('es-CO')}</b> clientes
            </span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span>
              Meta Anual fijada: <b style={{ color: 'var(--primary)', fontSize: 13 }}>{metaAnual.toLocaleString('es-CO')}</b> clientes
            </span>
            {sumaMeses !== metaAnual && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: 'rgba(217, 119, 6, 0.1)', color: '#D97706'
              }}>
                Diferencia: {sumaMeses > metaAnual ? `+${(sumaMeses - metaAnual).toLocaleString('es-CO')}` : `${(sumaMeses - metaAnual).toLocaleString('es-CO')}`}
              </span>
            )}
          </div>

          <button
            type="button"
            className="pr-btn pr-btn--outline"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={handleSumarMeses}
          >
            Alinear anual con suma ({sumaMeses})
          </button>
        </div>

        {/* ── BOTONES DE ACCIÓN ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="pr-btn pr-btn--outline"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="pr-btn pr-btn--primary"
            style={{ padding: '8px 20px', gap: 6, fontWeight: 700 }}
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? (
              <>
                <Loader2 size={15} className="pr-spin" />
                Guardando metas…
              </>
            ) : mensajeExito ? (
              <>
                <Check size={15} color="#10B981" />
                ¡Metas guardadas!
              </>
            ) : (
              <>
                <Check size={15} />
                Guardar Metas
              </>
            )}
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
