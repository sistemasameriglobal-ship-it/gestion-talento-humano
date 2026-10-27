// =============================================================
// src/components/contratos/ContratosKpis.jsx
// =============================================================
import { useMemo } from 'react'
import KpiCard, { KpiGrid } from '../ui/KpiCard'
import { calcularCiclosYProrroga } from '../../utils/contratosTemplates'
import { FileSignature, ShieldCheck, Clock, Award, AlertTriangle, GraduationCap } from 'lucide-react'

export default function ContratosKpis({
  contratos = [],
  filtroTipo,
  setFiltroTipo,
  filtroEstado,
  setFiltroEstado,
}) {
  const stats = useMemo(() => {
    let total = 0
    let enPrueba = 0
    let prorrogasTrimestrales = 0
    let contratosAnuales = 0
    let porVencerOPreaviso = 0
    let aprendices = 0

    contratos.forEach(c => {
      if (c.estado === 'finalizado') return
      total++

      if (c.tipo_contrato === 'aprendizaje') {
        aprendices++
        return
      }

      const info = calcularCiclosYProrroga(c)
      if (info) {
        if (info.esPeriodoPrueba) {
          enPrueba++
        } else if (info.esContratoAnual) {
          contratosAnuales++
        } else {
          prorrogasTrimestrales++
        }

        // Si faltan 30 días o menos para el fin del periodo actual o para el preaviso
        if (info.diasParaVencer >= 0 && info.diasParaVencer <= 30) {
          porVencerOPreaviso++
        }
      }
    })

    return { total, enPrueba, prorrogasTrimestrales, contratosAnuales, porVencerOPreaviso, aprendices }
  }, [contratos])

  return (
    <KpiGrid min={175}>
      <KpiCard
        label="Total Activos"
        value={stats.total}
        sub="Contratos vigentes"
        icon={FileSignature}
        tone="info"
        onClick={() => { setFiltroTipo(''); setFiltroEstado('') }}
        active={!filtroTipo && !filtroEstado}
      />
      <KpiCard
        label="En Período de Prueba"
        value={stats.enPrueba}
        sub="Primeros 3 meses (Evaluación)"
        icon={ShieldCheck}
        tone="warning"
        onClick={() => { setFiltroEstado(filtroEstado === 'en_prueba' ? '' : 'en_prueba'); setFiltroTipo('') }}
        active={filtroEstado === 'en_prueba'}
      />
      <KpiCard
        label="Prórroga Trimestral"
        value={stats.prorrogasTrimestrales}
        sub="Renovación cada 3 meses"
        icon={Clock}
        tone="purple"
        onClick={() => { setFiltroEstado(filtroEstado === 'prorroga_trimestral' ? '' : 'prorroga_trimestral'); setFiltroTipo('') }}
        active={filtroEstado === 'prorroga_trimestral'}
      />
      <KpiCard
        label="Contrato Anual (≥ 1 Año)"
        value={stats.contratosAnuales}
        sub="Renovable año a año (Art. 46)"
        icon={Award}
        tone="success"
        onClick={() => { setFiltroEstado(filtroEstado === 'contrato_anual' ? '' : 'contrato_anual'); setFiltroTipo('') }}
        active={filtroEstado === 'contrato_anual'}
      />
      <KpiCard
        label="Por Vencer (≤ 30 Días)"
        value={stats.porVencerOPreaviso}
        sub="Ventana de preaviso legal"
        icon={AlertTriangle}
        tone="danger"
        onClick={() => { setFiltroEstado(filtroEstado === 'por_vencer' ? '' : 'por_vencer'); setFiltroTipo('') }}
        active={filtroEstado === 'por_vencer'}
      />
    </KpiGrid>
  )
}
