import { useState, useEffect } from 'react'
import { Calendar, Trophy, Target, Percent, Users, Edit3, Check, X, Loader2, Snowflake, Sliders } from 'lucide-react'
import { colorPct } from '../../utils/productividadHelpers'
import { META_EQUIPO_MENSUAL_DEFAULT, META_FRIOS_MINIMO } from '../../utils/productividadConstants'
import { obtenerMetasEquipo, guardarMetaMesRapida, guardarMetasEquipo } from '../../api/productividad'
import ModalMetasEquipo from './ModalMetasEquipo'

export default function ProductividadKPIs({
  cfg, etiquetaPeriodo, totalGeneral, datos, promedioEquipo, resumenPeriodo,
  rankedByPeriodo, valorPeriodo, statsPeriodo, mejorMesIdx, monthlyTotals = [], monthlyTotalGen = [], MESES,
  currentCompany = 'ameriglobal', mesFiltroIdx = -1, anioActivo = new Date().getFullYear(),
}) {
  const mejor = rankedByPeriodo[0]
  const nombreMejor = mejor?.nombre.split(' ').slice(0, 2).join(' ') || '—'

  // Configuración completa de metas (12 meses + anual)
  const [metasConfig, setMetasConfig] = useState({
    anual: META_EQUIPO_MENSUAL_DEFAULT * 12,
    anualFijada: null,
    mensuales: Array(12).fill(META_EQUIPO_MENSUAL_DEFAULT),
    metaBase: META_EQUIPO_MENSUAL_DEFAULT,
  })

  // Modal completo de metas
  const [modalMetasOpen, setModalMetasOpen] = useState(false)

  // Edición rápida inline desde el banner
  const [editandoRapido, setEditandoRapido] = useState(false)
  const [inputRapido, setInputRapido] = useState(String(META_EQUIPO_MENSUAL_DEFAULT))
  const [guardandoRapido, setGuardandoRapido] = useState(false)

  // Carga de metas según departamento, año y empresa
  useEffect(() => {
    if (!cfg.usaClientes) return
    let cancelado = false
    obtenerMetasEquipo(cfg.id, anioActivo, currentCompany).then(val => {
      if (!cancelado && val) {
        setMetasConfig(val)
      }
    })
    return () => { cancelado = true }
  }, [cfg.id, anioActivo, currentCompany, cfg.usaClientes])

  // Departamentos con Clientes Asignados / Resueltos (Ventas, UW-BS)
  if (cfg.usaClientes) {
    const { asignados, resueltos, frios = 0, totalGen = resueltos, pct } = resumenPeriodo
    const sMejor = mejor ? statsPeriodo(mejor) : null

    // Cálculo de meta grupal (mensual o anual)
    const esMes = mesFiltroIdx >= 0
    const metaMesActual = (metasConfig.mensuales && metasConfig.mensuales[mesFiltroIdx] != null)
      ? metasConfig.mensuales[mesFiltroIdx]
      : (metasConfig.metaBase || META_EQUIPO_MENSUAL_DEFAULT)

    const metaReferencia = esMes
      ? metaMesActual
      : (metasConfig.anual || (metasConfig.metaBase * 12) || (META_EQUIPO_MENSUAL_DEFAULT * 12))

    // Clientes cerrados en el período actual
    const cerradosActuales = esMes
      ? ((monthlyTotalGen && monthlyTotalGen[mesFiltroIdx] != null) ? monthlyTotalGen[mesFiltroIdx] : totalGen)
      : totalGen

    const pctMeta = metaReferencia > 0 ? Math.round((cerradosActuales / metaReferencia) * 100) : 0
    const restantes = Math.max(0, metaReferencia - cerradosActuales)
    const promedioMes = (!esMes && totalGen > 0) ? (totalGen / 12).toFixed(0) : 0

    // Total general acumulado de todo el año
    const totalAnualCerrados = (monthlyTotalGen && monthlyTotalGen.length)
      ? monthlyTotalGen.reduce((s, v) => s + (v || 0), 0)
      : totalGen
    const pctAnual = metasConfig.anual > 0 ? Math.round((totalAnualCerrados / metasConfig.anual) * 100) : 0

    // Conteo de asesores que cumplen el mínimo de 11 clientes en frío
    const asesoresCumplenFrios = datos.filter(p => (statsPeriodo(p)?.frios || 0) >= META_FRIOS_MINIMO).length
    const pctAsesoresFrios = datos.length > 0 ? Math.round((asesoresCumplenFrios / datos.length) * 100) : 0

    // Guardado rápido desde el input inline del banner
    const handleGuardarRapido = async (e) => {
      e?.preventDefault()
      const num = Math.round(Number(inputRapido))
      if (!num || num <= 0) return
      setGuardandoRapido(true)
      try {
        if (esMes) {
          const actualizados = await guardarMetaMesRapida(cfg.id, anioActivo, mesFiltroIdx, num, currentCompany)
          setMetasConfig(actualizados)
        } else {
          const actualizados = await guardarMetasEquipo({
            departamento: cfg.id,
            anio: anioActivo,
            empresa: currentCompany,
            mensuales: metasConfig.mensuales,
            anual: num,
          })
          setMetasConfig(actualizados)
        }
        setEditandoRapido(false)
      } finally {
        setGuardandoRapido(false)
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Banner de Meta Mensual y Anual del Equipo (Editable con Gestión Completa) */}
        <div className="pr-meta-banner">
          <div className="pr-meta-top">
            <div className="pr-meta-title-group">
              <div className="pr-meta-icon"><Target size={20} /></div>
              <div>
                <div className="pr-meta-title">
                  Meta {esMes ? `de ${MESES[mesFiltroIdx]} (${anioActivo})` : `Anual (${anioActivo})`} del Equipo: Clientes Cerrados
                </div>
                <div className="pr-meta-subtitle">
                  {esMes
                    ? `Objetivo del mes: ${metaReferencia.toLocaleString('es-CO')} clientes cerrados entre todo el equipo (Meta Anual: ${metasConfig.anual.toLocaleString('es-CO')})`
                    : `Objetivo anual: ${metaReferencia.toLocaleString('es-CO')} clientes cerrados en el año (Planificado mes a mes)`}
                </div>
              </div>
            </div>

            <div className="pr-meta-actions">
              {/* Botón principal: Modal completo para asignar metas por mes y anuales */}
              <button
                type="button"
                className="pr-btn pr-btn--primary"
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 8,
                  gap: 6,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 28%, transparent)'
                }}
                onClick={() => setModalMetasOpen(true)}
                title="Abrir panel completo para asignar metas por mes y metas anuales"
              >
                <Sliders size={13} />
                <span>Asignar Metas (Mes y Año)</span>
              </button>

              {/* Botón secundario: Edición rápida inline */}
              {editandoRapido ? (
                <form className="pr-meta-edit-form" onSubmit={handleGuardarRapido}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="pr-meta-input"
                    value={inputRapido}
                    onChange={e => setInputRapido(e.target.value)}
                    autoFocus
                    placeholder={String(metaReferencia)}
                  />
                  <button
                    type="submit"
                    className="pr-btn pr-btn--primary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    disabled={guardandoRapido}
                    title="Guardar meta rápida"
                  >
                    {guardandoRapido ? <Loader2 size={13} className="pr-spin" /> : <Check size={13} />}
                  </button>
                  <button
                    type="button"
                    className="pr-btn pr-btn--outline"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    onClick={() => { setEditandoRapido(false); setInputRapido(String(metaReferencia)) }}
                    title="Cancelar"
                  >
                    <X size={13} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="pr-meta-edit-btn"
                  onClick={() => { setInputRapido(String(metaReferencia)); setEditandoRapido(true) }}
                  title={esMes ? `Cambio rápido de meta de ${MESES[mesFiltroIdx]}` : `Cambio rápido de meta anual ${anioActivo}`}
                >
                  <Edit3 size={13} />
                  <span>{esMes ? `Meta ${MESES[mesFiltroIdx]}` : 'Meta Anual'} ({metaReferencia})</span>
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
                <b style={{ color: '#059669' }}>✓ ¡Excelente trabajo! El equipo ha alcanzado y superado la meta {esMes ? `de ${MESES[mesFiltroIdx]}` : 'anual'}.</b>
              ) : (
                <>Faltan <b style={{ color: 'var(--text)' }}>{restantes.toLocaleString('es-CO')}</b> clientes cerrados para cumplir la meta {esMes ? `de ${MESES[mesFiltroIdx]}` : `anual (${anioActivo})`}.</>
              )}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {esMes && (
                <div
                  className="pr-meta-frios-chip"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 10%, var(--surface))',
                    color: 'var(--primary)',
                    borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setModalMetasOpen(true)}
                  title="Haz clic para ver o ajustar las metas del año"
                >
                  <Target size={13} />
                  <span>
                    <b>Meta Anual ({anioActivo}):</b> {totalAnualCerrados.toLocaleString('es-CO')} / {metasConfig.anual.toLocaleString('es-CO')} ({pctAnual}%)
                  </span>
                </div>
              )}

              <div className="pr-meta-frios-chip" title={`Meta individual: al menos ${META_FRIOS_MINIMO} clientes en frío por asesor`}>
                <Snowflake size={13} />
                <span>
                  <b>Mínimo {META_FRIOS_MINIMO} en frío:</b> {asesoresCumplenFrios} de {datos.length} asesores cumplen ({pctAsesoresFrios}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Asignación y Gestión de Metas */}
        <ModalMetasEquipo
          open={modalMetasOpen}
          onClose={() => setModalMetasOpen(false)}
          cfg={cfg}
          anio={anioActivo}
          currentCompany={currentCompany}
          metasConfig={metasConfig}
          monthlyTotals={monthlyTotalGen && monthlyTotalGen.length ? monthlyTotalGen : monthlyTotals}
          onSave={guardado => {
            setMetasConfig(guardado)
            setInputRapido(String(esMes ? guardado.mensuales[mesFiltroIdx] : guardado.anual))
          }}
          mesFiltroIdx={mesFiltroIdx}
        />

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
