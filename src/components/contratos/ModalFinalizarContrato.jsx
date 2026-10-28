// =============================================================
// src/components/contratos/ModalFinalizarContrato.jsx
// =============================================================
import { useState } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import {
  calcularCiclosYProrroga,
  imprimirContrato,
  formatearFechaLarga,
} from '../../utils/contratosTemplates'
import {
  AlertTriangle,
  FileText,
  Printer,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react'

export default function ModalFinalizarContrato({
  contrato,
  onClose,
  onConfirmFinalizar,
}) {
  const infoProrroga = calcularCiclosYProrroga(contrato)
  const cicloActual = infoProrroga?.cicloActual || {}
  const esPrueba = cicloActual.esPrueba

  const [motivo, setMotivo] = useState(esPrueba ? 'no_supero_prueba' : 'no_renovacion_trimestre')
  const [fechaEfectiva, setFechaEfectiva] = useState(
    esPrueba ? new Date().toISOString().slice(0, 10) : (cicloActual.fin || new Date().toISOString().slice(0, 10))
  )
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!contrato) return null

  const handleFinalizar = async (imprimirCarta = false) => {
    try {
      setGuardando(true)
      const datosTerminacion = {
        estado: 'finalizado',
        fecha_fin_efectiva: fechaEfectiva,
        motivo_finalizacion: motivo,
        observaciones_finalizacion: observaciones,
        fecha_comunicacion: new Date().toISOString().slice(0, 10),
      }

      await onConfirmFinalizar(contrato.id, datosTerminacion)

      if (imprimirCarta) {
        imprimirContrato(contrato, 'carta_terminacion', datosTerminacion)
      }
      onClose()
    } catch (e) {
      console.error(e)
      alert(e.message || 'Error al registrar finalización del contrato.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AnimatedModal
      open={Boolean(contrato)}
      onRequestClose={onClose}
      maxWidth="640px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '40px' }}
      modalStyle={{ padding: '24px 28px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: 8, borderRadius: 8 }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#B91C1C' }}>
              Finalizar Contrato / No Renovación
            </h3>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Colaborador: <strong>{contrato.nombre_trabajador}</strong> ({contrato.tipo_documento} {contrato.numero_documento})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 18, fontSize: 12.5, color: '#92400E', lineHeight: 1.5 }}>
        <strong>Ciclo en curso:</strong> {cicloActual.nombre || 'Periodo Trimestral'}<br />
        Vigencia actual: {formatearFechaLarga(cicloActual.inicio)} al {formatearFechaLarga(cicloActual.fin)}
        {infoProrroga?.fechaLimitePreaviso && (
          <div>
            Fecha límite de preaviso de 30 días: <strong>{formatearFechaLarga(infoProrroga.fechaLimitePreaviso)}</strong>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
          Motivo de la Finalización *
        </label>
        <select
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <option value="no_supero_prueba">
            🛡️ No superó el período de prueba (primeros 2 meses)
          </option>
          <option value="no_renovacion_trimestre">
            ⏱️ No renovación al término del trimestre (decisión de la empresa)
          </option>
          <option value="no_renovacion_anual">
            ⭐ No renovación al término del año (decisión de la empresa)
          </option>
          <option value="renuncia">
            👋 Renuncia voluntaria del colaborador
          </option>
          <option value="justa_causa">
            ⚖️ Terminación unilateral por justa causa
          </option>
          <option value="mutuo_acuerdo">
            🤝 Terminación por mutuo acuerdo
          </option>
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
          Fecha Efectiva de Retiro / Terminación *
        </label>
        <input
          type="date"
          value={fechaEfectiva}
          onChange={e => setFechaEfectiva(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
          Observaciones adicionales (Opcional)
        </label>
        <textarea
          rows={3}
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Detalles sobre entrega de puesto, liquidación o circunstancias de la terminación..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            fontSize: 13, resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onClose}
          disabled={guardando}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() => handleFinalizar(false)}
          disabled={guardando}
          style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #FCA5A5',
            background: '#FEE2E2', color: '#B91C1C', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {guardando ? 'Guardando...' : 'Finalizar Contrato'}
        </button>

        <button
          type="button"
          onClick={() => handleFinalizar(true)}
          disabled={guardando}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Printer size={15} />
          <span>Finalizar y Emitir Carta Oficial</span>
        </button>
      </div>
    </AnimatedModal>
  )
}
