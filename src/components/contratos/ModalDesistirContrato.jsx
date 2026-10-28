// =============================================================
// src/components/contratos/ModalDesistirContrato.jsx
// =============================================================
// Modal para registrar el desistimiento de un candidato que firmó o
// llenó contrato pero no se presentó a laborar.
// =============================================================
import { useState } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import { UserX, AlertTriangle, X } from 'lucide-react'

export default function ModalDesistirContrato({
  contrato,
  open,
  onClose,
  onConfirm,
}) {
  const [motivo, setMotivo] = useState('No se presentó el día de inicio')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!contrato) return null

  const handleConfirmar = async (e) => {
    e.preventDefault()
    try {
      setGuardando(true)
      const motivoCompleto = observaciones.trim()
        ? `${motivo} — ${observaciones.trim()}`
        : motivo

      await onConfirm(contrato, motivoCompleto)
      onClose()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Error al registrar desistimiento')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AnimatedModal
      open={open}
      onRequestClose={onClose}
      maxWidth="500px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '40px' }}
      modalStyle={{ padding: '24px 26px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#F1F5F9', color: '#475569', padding: 8, borderRadius: 8 }}>
            <UserX size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              Registrar Desistimiento
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Candidato: <strong>{contrato.nombre_trabajador}</strong>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12.5, color: '#92400E', lineHeight: 1.5 }}>
        <strong>El candidato no ingresó a laborar:</strong><br />
        Este contrato quedará marcado como <em>"Desistió del proceso / No se presentó"</em>. No se creará ningún empleado en la lista activa de la empresa.
      </div>

      <form onSubmit={handleConfirmar}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Motivo Principal
          </label>
          <select
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          >
            <option value="No se presentó el día de inicio">No se presentó el día de inicio laboral</option>
            <option value="Desistió por otra oferta laboral">Aceptó otra oferta laboral</option>
            <option value="Desistió por motivos personales">Motivos personales / familiares</option>
            <option value="Desistió por inconformidad salarial/horario">Inconformidad con condiciones u horario</option>
            <option value="No entregó documentos requeridos">No completó la documentación requerida</option>
            <option value="Cancelado por la empresa antes de iniciar">Cancelado por la empresa antes de iniciar</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Observaciones Adicionales (Opcional)
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Detalles sobre por qué desistió o no se presentó..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12.5 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn"
            disabled={guardando}
            style={{
              background: '#64748B', color: '#ffffff', border: 'none',
              padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            <UserX size={15} />
            <span>{guardando ? 'Guardando...' : 'Confirmar Desistimiento'}</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  )
}
