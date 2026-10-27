import { useState, useEffect, useMemo } from 'react'
import { Target, X, Check, Loader2, Sparkles, Calculator, Copy, Zap } from 'lucide-react'
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
      // Sincronización en vivo: al subir o bajar la meta de un mes, se suma o resta en la meta anual
      const nuevaSuma = next.reduce((s, v) => s + (Number(v) || 0), 0)
      setMetaAnual(nuevaSuma)
      return next
    })
  }

  // Distribuir meta anual equitativamente entre los 12 meses
  const handleDistribuirEquitativo = () => {
    const cadaMes = Math.max(0, Math.round(metaAnual / 12))
    const nuevos = Array(12).fill(cadaMes)
    setMensuales(nuevos)
    setMetaAnual(cadaMes * 12)
  }

  // Sumar automáticamente los 12 meses y actualizar la meta anual
  const handleSumarMeses = () => {
    setMetaAnual(sumaMeses)
  }

  // Copiar valor unificado a todos los meses
  const handleAplicarATodos = () => {
    const num = Math.max(0, parseInt(valorUnificado, 10) || 0)
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
    <AnimatedModal
      open={open}
      onRequestClose={onClose}
      maxWidth="1140px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '28px', paddingBottom: '28px', overflowY: 'auto' }}
    >
      <div className="pr-metas-modal">
        {/* Cabecera compacta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
              color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 20%, transparent)'
            }}>
              <Target size={22} />
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
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Configura los objetivos mensuales mes a mes y la meta global anual de clientes cerrados.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pr-btn pr-btn--outline"
            style={{ padding: 6, borderRadius: 8 }}
            onClick={onClose}
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── SECCIÓN 1: HERO GRID (META ANUAL + HERRAMIENTAS HORIZONTALES) ── */}
        <div className="pr-metas-hero-grid">
          {/* Tarjeta Izquierda: Meta Anual */}
          <div className="pr-metas-hero-card">
            <div>
              <span className="pr-metas-hero-title">
                <Target size={14} /> Objetivo Global Anual ({anio})
              </span>
              <div className="pr-metas-annual-input-wrap">
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  Meta Anual:
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="pr-metas-annual-input"
                  value={metaAnual}
                  onChange={e => setMetaAnual(Math.max(1, parseInt(e.target.value, 10) || 0))}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>clientes cerrados</span>
              </div>
            </div>

            {/* Barra de progreso anual actual */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, marginBottom: 5 }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Progreso en {anio}: <strong style={{ color: 'var(--text)' }}>{totalRealAnual.toLocaleString('es-CO')}</strong> de {metaAnual.toLocaleString('es-CO')} cerrados
                </span>
                <span style={{ fontWeight: 800, color: pctAnual >= 100 ? '#059669' : (pctAnual >= 70 ? 'var(--primary)' : '#D97706') }}>
                  {pctAnual}% alcanzado
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

          {/* Tarjeta Derecha: Herramientas Rápidas de Distribución */}
          <div className="pr-metas-hero-card">
            <div>
              <span className="pr-metas-hero-title" style={{ color: 'var(--text)' }}>
                <Zap size={14} color="var(--primary)" /> Herramientas de Distribución
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  type="button"
                  className="pr-btn pr-btn--outline"
                  style={{ fontSize: 11.5, padding: '6px 11px', gap: 5, flex: 1 }}
                  onClick={handleDistribuirEquitativo}
                  title="Divide la meta anual en 12 partes iguales y las aplica a cada mes"
                >
                  <Sparkles size={13} color="var(--primary)" />
                  Distribuir en 12 meses (~{Math.round(metaAnual / 12)}/mes)
                </button>
                <button
                  type="button"
                  className="pr-btn pr-btn--outline"
                  style={{ fontSize: 11.5, padding: '6px 11px', gap: 5, flex: 1 }}
                  onClick={handleSumarMeses}
                  title="Ajusta la meta anual a la suma de los 12 meses"
                >
                  <Calculator size={13} color="#059669" />
                  Igualar a suma ({sumaMeses.toLocaleString('es-CO')})
                </button>
              </div>
            </div>

            {/* Asignación rápida a todos */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              background: 'var(--bg)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Copiar a todos los meses:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={valorUnificado}
                  onChange={e => setValorUnificado(e.target.value)}
                  style={{
                    width: 70, padding: '4px 6px', fontSize: 13, fontWeight: 800,
                    borderRadius: 6, border: '1px solid var(--border)', textAlign: 'center',
                    background: 'var(--surface)', color: 'var(--text)'
                  }}
                  placeholder="100"
                />
                <button
                  type="button"
                  className="pr-btn pr-btn--primary"
                  style={{ fontSize: 11, padding: '5px 10px', gap: 4 }}
                  onClick={handleAplicarATodos}
                  title="Aplica este valor a los 12 meses del año"
                >
                  <Copy size={11} />
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: GRID DE LOS 12 MESES ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              Metas Mensuales por Mes (Enero – Diciembre)
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Suma actual: <strong style={{ color: 'var(--text)' }}>{sumaMeses.toLocaleString('es-CO')}</strong> clientes
            </span>
          </div>

          <div className="pr-metas-grid">
            {MESES.map((mesCorto, idx) => {
              const metaMes = mensuales[idx] || 0
              const realMes = monthlyTotals[idx] || 0
              const pctMes = metaMes > 0 ? Math.round((realMes / metaMes) * 100) : 0
              const esMesSeleccionado = mesFiltroIdx === idx

              return (
                <div
                  key={mesCorto}
                  className={`pr-metas-card ${esMesSeleccionado ? 'pr-metas-card--active' : ''}`}
                >
                  <div className="pr-metas-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className="pr-metas-month-name">
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
                        fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                        background: pctMes >= 100 ? 'var(--success-bg)' : (pctMes >= 70 ? 'var(--primary-light)' : 'rgba(217, 119, 6, 0.1)'),
                        color: pctMes >= 100 ? 'var(--success-text)' : (pctMes >= 70 ? 'var(--primary)' : '#D97706')
                      }}>
                        {pctMes}%
                      </span>
                    )}
                  </div>

                  {/* Input de meta con espacio amplio para números de 3 a 6 dígitos */}
                  <div className="pr-metas-card-input-box">
                    <span className="pr-metas-card-input-label">Meta:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="pr-metas-card-input"
                      value={metaMes}
                      onChange={e => handleMesChange(idx, e.target.value)}
                    />
                  </div>

                  <div className="pr-metas-card-bottom">
                    <span>Real: <strong style={{ color: 'var(--text)' }}>{realMes}</strong></span>
                    <span>
                      {realMes >= metaMes && metaMes > 0 ? (
                        <strong style={{ color: '#059669' }}>✓ Cumplida</strong>
                      ) : (
                        `Faltan ${Math.max(0, metaMes - realMes)}`
                      )}
                    </span>
                  </div>

                  {metaMes > 0 && (
                    <div style={{ height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pctMes, 100)}%`,
                        background: pctMes >= 100 ? '#10B981' : (pctMes >= 70 ? 'var(--primary)' : '#F59E0B'),
                        borderRadius: 999
                      }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RESUMEN EN VIVO Y DIFERENCIA ── */}
        <div className="pr-metas-summary-box">
          {sumaMeses === metaAnual ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontWeight: 700 }}>
              <Check size={18} />
              <span>Metas sincronizadas: La suma de los 12 meses coincide exactamente con la meta anual ({metaAnual.toLocaleString('es-CO')} clientes).</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>Suma de 12 meses: <strong style={{ color: 'var(--text)' }}>{sumaMeses.toLocaleString('es-CO')}</strong></span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span>Meta Anual fijada: <strong style={{ color: 'var(--primary)' }}>{metaAnual.toLocaleString('es-CO')}</strong></span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(217, 119, 6, 0.12)', color: '#D97706'
                }}>
                  Diferencia: {sumaMeses > metaAnual ? `+${(sumaMeses - metaAnual).toLocaleString('es-CO')}` : `${(sumaMeses - metaAnual).toLocaleString('es-CO')}`}
                </span>
              </div>

              <button
                type="button"
                className="pr-btn pr-btn--outline"
                style={{ fontSize: 11.5, padding: '5px 12px', gap: 5 }}
                onClick={handleSumarMeses}
                title="Ajusta la meta anual a la suma de los 12 meses"
              >
                <Calculator size={13} color="var(--primary)" />
                Alinear meta anual a {sumaMeses.toLocaleString('es-CO')}
              </button>
            </>
          )}
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
            style={{ padding: '8px 22px', gap: 6, fontWeight: 700 }}
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
