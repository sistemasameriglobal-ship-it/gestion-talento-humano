import { useState, useEffect } from 'react'
import { Calendar, Trophy, Target, Percent, Users, Edit3, Check, X, Loader2, Snowflake } from 'lucide-react'
import { colorPct } from '../../utils/productividadHelpers'
import { META_EQUIPO_MENSUAL_DEFAULT, META_FRIOS_MINIMO } from '../../utils/productividadConstants'
import { obtenerMetaEquipo, guardarMetaEquipo } from '../../api/productividad'

export default function ProductividadKPIs({
  cfg, etiquetaPeriodo, totalGeneral, datos, promedioEquipo, resumenPeriodo,
  rankedByPeriodo, valorPeriodo, statsPeriodo, mejorMesIdx, monthlyTotals, MESES,
  currentCompany = 'ameriglobal', mesFiltroIdx = -1,
}) {
  const mejor = rankedByPeriodo[0]
  const nombreMejor = mejor?.nombre.split(' ').slice(0, 2).join(' ') || '—'

  // Estado para la meta mensual de clientes cerrados del equipo
  const [metaEquipo, setMetaEquipo] = useState(META_EQUIPO_MENSUAL_DEFAULT)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [inputMeta, setInputMeta] = useState(String(META_EQUIPO_MENSUAL_DEFAULT))
  const [guardandoMeta, setGuardandoMeta] = useState(false)

  useEffect(() => {
    if (!cfg.usaClientes) return
    let cancelado = false
    obtenerMetaEquipo(cfg.id, currentCompany).then(val => {
      if (!cancelado) {
        setMetaEquipo(val)
        setInputMeta(String(val))
      }
    })
    return () => { cancelado = true }
  }, [cfg.id, currentCompany, cfg.usaClientes])

  const handleGuardarMeta = async (e) => {
    e?.preventDefault()
    const num = Math.round(Number(inputMeta))
    if (!num || num <= 0) return
    setGuardandoMeta(true)
    try {
      const guardado = await guardarMetaEquipo(cfg.id, currentCompany, num)
      setMetaEquipo(guardado)
      setInputMeta(String(guardado))
      setEditandoMeta(false)
    } finally {
      setGuardandoMeta(false)
    }
  }

  // Departamentos con Clientes Asignados / Resueltos (Ventas, UW-BS)
  if (cfg.usaClientes) {
    const { asignados, resueltos, frios = 0, totalGen = resueltos, pct } = resumenPeriodo
    const sMejor = mejor ? statsPeriodo(mejor) : null

    // Cálculo de meta grupal (mensual o anual)
    const esMes = mesFiltroIdx >= 0
    const metaReferencia = esMes ? metaEquipo : (metaEquipo * 12)
    const cerradosActuales = totalGen
    const pctMeta = metaReferencia > 0 ? Math.round((cerradosActuales / metaReferencia) * 100) : 0
    const restantes = Math.max(0, metaReferencia - cerradosActuales)
    const promedioMes = (!esMes && totalGen > 0) ? (totalGen / 12).toFixed(0) : 0

    // Conteo de asesores que cumplen el mínimo de 11 clientes en frío
    const asesoresCumplenFrios = datos.filter(p => (statsPeriodo(p)?.frios || 0) >= META_FRIOS_MINIMO).length
    const pctAsesoresFrios = datos.length > 0 ? Math.round((asesoresCumplenFrios / datos.length) * 100) : 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Banner de Meta Mensual del Equipo (Editable) */}
        <div className="pr-meta-banner">
          <div className="pr-meta-top">
            <div className="pr-meta-title-group">
              <div className="pr-meta-icon"><Target size={20} /></div>
              <div>
                <div className="pr-meta-title">
                  Meta {esMes ? `de ${MESES[mesFiltroIdx]}` : 'Mensual'} del Equipo: Clientes Cerrados
                </div>
                <div className="pr-meta-subtitle">
                  {esMes
                    ? `Objetivo del mes: ${metaEquipo.toLocaleString('es-CO')} clientes cerrados entre todo el equipo`
                    : `Objetivo base: ${metaEquipo.toLocaleString('es-CO')} clientes cerrados por mes (${metaReferencia.toLocaleString('es-CO')} en el año)`}
                </div>
              </div>
            </div>

            <div className="pr-meta-actions">
              {editandoMeta ? (
                <form className="pr-meta-edit-form" onSubmit={handleGuardarMeta}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="pr-meta-input"
                    value={inputMeta}
                    onChange={e => setInputMeta(e.target.value)}
                    autoFocus
                    placeholder="Ej. 600"
                  />
                  <button
                    type="submit"
                    className="pr-btn pr-btn--primary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    disabled={guardandoMeta}
                    title="Guardar meta"
                  >
                    {guardandoMeta ? <Loader2 size={13} className="pr-spin" /> : <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className="pr-btn pr-btn--outline"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    onClick={() => { setEditandoMeta(false); setInputMeta(String(metaEquipo)) }}
                    title="Cancelar"
                  >
                    <X size={13} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="pr-meta-edit-btn"
                  onClick={() => setEditandoMeta(true)}
                  title="Haz clic para modificar el objetivo mensual de clientes cerrados"
                >
                  <Edit3 size={13} />
                  <span>Editar Meta ({metaEquipo})</span>
                </button>
              )}
            </div>
          </div>

          <div className="pr-meta-progress-wrap">
            <div className="pr-meta-stats-row">
              <div className="pr-meta-numbers">
                {cerradosActuales.toLocaleString('es-CO')}
                <span> / {metaReferencia.toLocaleString('es-CO')} clientes cerrados</span>
                {!esMes && cerradosActuales > 0 && (
                  <span style={{ fontSize: 12, marginLeft: 8, color: 'var(--text-muted)' }}>
                    (Promedio: ~{promedioMes}/mes)
                  </span>
                )}
              </div>
              <div className={`pr-meta-pct-badge ${pctMeta >= 100 ? 'pr-meta-pct-badge--ok' : 'pr-meta-pct-badge--warn'}`}>
                {pctMeta >= 100 ? `🎉 ¡Meta cumplida! (${pctMeta}%)` : `${pctMeta}% alcanzado`}
              </div>
            </div>

            <div className="pr-meta-bar-bg">
              <div
                className="pr-meta-bar-fill"
                style={{
                  width: `${Math.min(pctMeta, 100)}%`,
                  background: pctMeta >= 100 ? '#10B981' : (pctMeta >= 70 ? 'var(--primary)' : '#F59E0B'),
                }}
              />
            </div>
          </div>

          <div className="pr-meta-bottom">
            <span>
              {pctMeta >= 100 ? (
                <b style={{ color: '#059669' }}>✓ ¡Excelente trabajo! El equipo ha alcanzado y superado la meta propuesta.</b>
              ) : (
                <>Faltan <b style={{ color: 'var(--text)' }}>{restantes.toLocaleString('es-CO')}</b> clientes cerrados para cumplir la meta {esMes ? `de ${MESES[mesFiltroIdx]}` : 'anual'}.</>
              )}
            </span>

            <div className="pr-meta-frios-chip" title={`Meta individual: al menos ${META_FRIOS_MINIMO} clientes en frío por asesor`}>
              <Snowflake size={13} />
              <span>
                <b>Mínimo {META_FRIOS_MINIMO} en frío:</b> {asesoresCumplenFrios} de {datos.length} asesores cumplen ({pctAsesoresFrios}%)
              </span>
            </div>
          </div>
        </div>

        {/* Tarjetas resumen de KPIs */}
        <div className="pr-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <div className="pr-kpi">
            <div className="pr-kpi-accent" />
            <span className="pr-kpi-label">Clientes asignados {etiquetaPeriodo}</span>
            <span className="pr-kpi-value">{asignados.toLocaleString('es-CO')}</span>
            <span className="pr-kpi-sub"><Calendar size={12} /> {datos.length} personas</span>
          </div>
          <div className="pr-kpi">
            <div className="pr-kpi-accent" />
            <span className="pr-kpi-label">Clientes resueltos (Asignados)</span>
            <span className="pr-kpi-value">{resueltos.toLocaleString('es-CO')}</span>
            <span className="pr-kpi-sub"><Target size={12} color="var(--secondary-dark)" /> de {asignados.toLocaleString('es-CO')} asignados</span>
          </div>
          <div className="pr-kpi">
            <div className="pr-kpi-accent" />
            <span className="pr-kpi-label">% Resolución (Meta 40%)</span>
            <span className="pr-kpi-value" style={{ color: asignados > 0 ? colorPct(pct) : undefined }}>{pct}%</span>
            <span className="pr-kpi-sub" style={{ color: pct >= 40 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
              <Percent size={12} /> {pct >= 40 ? '✓ Cumple meta (40%)' : '⚠ Bajo meta (40%)'}
            </span>
          </div>
          <div className="pr-kpi">
            <div className="pr-kpi-accent" />
            <span className="pr-kpi-label">Clientes en frío {etiquetaPeriodo}</span>
            <span className="pr-kpi-value" style={{ color: '#0284C7' }}>{frios.toLocaleString('es-CO')}</span>
            <span className="pr-kpi-sub">
              {asesoresCumplenFrios}/{datos.length} cumplen mín. {META_FRIOS_MINIMO}
            </span>
          </div>
          <div className="pr-kpi">
            <div className="pr-kpi-accent" />
            <span className="pr-kpi-label">Total Resueltos General</span>
            <span className="pr-kpi-value" style={{ color: 'var(--primary)' }}>{totalGen.toLocaleString('es-CO')}</span>
            <span className="pr-kpi-sub">Incluye asignados + en frío</span>
          </div>
          <div className="pr-kpi">
            <div className="pr-kpi-accent" />
            <span className="pr-kpi-label">Mejor {cfg.personaLabelLower}</span>
            <span className="pr-kpi-value" style={{ fontSize: 15, lineHeight: 1.3 }}>{sMejor && sMejor.totalGen > 0 ? nombreMejor : '—'}</span>
            <span className="pr-kpi-sub">
              <Trophy size={12} color="#F59E0B" /> {sMejor ? `${sMejor.totalGen} total (${sMejor.resu} asig + ${sMejor.frios} frío · ${sMejor.pct}%)` : 'sin datos'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Departamentos de un solo valor (Global Link)
  return (
    <div className="pr-kpis">
      <div className="pr-kpi">
        <div className="pr-kpi-accent" />
        <span className="pr-kpi-label">Total {etiquetaPeriodo}</span>
        <span className="pr-kpi-value">{totalGeneral.toLocaleString('es-CO')}</span>
        <span className="pr-kpi-sub"><Users size={12} /> {datos.length} personas</span>
      </div>
      <div className="pr-kpi">
        <div className="pr-kpi-accent" />
        <span className="pr-kpi-label">Promedio por persona</span>
        <span className="pr-kpi-value">{promedioEquipo.toFixed(1)}</span>
        <span className="pr-kpi-sub">{cfg.unidadPlural} {etiquetaPeriodo}</span>
      </div>
      <div className="pr-kpi">
        <div className="pr-kpi-accent" />
        <span className="pr-kpi-label">Mejor {cfg.personaLabelLower}</span>
        <span className="pr-kpi-value" style={{ fontSize: 15, lineHeight: 1.3 }}>{nombreMejor}</span>
        <span className="pr-kpi-sub"><Trophy size={12} color="#F59E0B" /> {mejor ? valorPeriodo(mejor) : 0} {cfg.unidadPlural}</span>
      </div>
      <div className="pr-kpi">
        <div className="pr-kpi-accent" />
        <span className="pr-kpi-label">Mejor mes del equipo</span>
        <span className="pr-kpi-value">{mejorMesIdx >= 0 ? MESES[mejorMesIdx] : '—'}</span>
        <span className="pr-kpi-sub">{mejorMesIdx >= 0 ? `${monthlyTotals[mejorMesIdx]} ${cfg.unidadPlural} en total` : 'sin datos'}</span>
      </div>
    </div>
  )
}
