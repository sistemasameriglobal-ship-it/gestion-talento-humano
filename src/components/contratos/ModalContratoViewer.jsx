// =============================================================
// src/components/contratos/ModalContratoViewer.jsx
// =============================================================
import { useState } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import {
  generarHtmlDocumento,
  imprimirContrato,
  descargarComoWord,
} from '../../utils/contratosTemplates'
import {
  Printer,
  Download,
  Copy,
  Edit,
  X,
  FileCheck2,
  Lock,
  Files,
  Check,
} from 'lucide-react'

export default function ModalContratoViewer({ contrato, onClose, onEdit }) {
  const [tab, setTab] = useState('completo') // 'completo' | 'principal' | 'confidencialidad'
  const [copiado, setCopiado] = useState(false)

  if (!contrato) return null

  const esAprendiz = contrato.tipo_contrato === 'aprendizaje'
  const tituloModal = esAprendiz ? 'Contrato de Aprendizaje' : 'Contrato a Término Fijo Inferior a 1 Año'

  const htmlContent = generarHtmlDocumento(contrato, tab)

  const handleCopiar = () => {
    // Extraer texto plano simple del html
    const div = document.createElement('div')
    div.innerHTML = htmlContent
    const texto = div.innerText || div.textContent || ''
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <AnimatedModal
      open={Boolean(contrato)}
      onRequestClose={onClose}
      maxWidth="1020px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '24px', paddingBottom: '32px' }}
      modalStyle={{ padding: '24px 28px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {tituloModal}
            </h3>
            <span className={`contrato-badge-tipo ${esAprendiz ? 'badge-aprendizaje' : 'badge-termino-fijo'}`}>
              {esAprendiz ? 'Aprendiz SENA' : 'Término Fijo < 1 Año'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Colaborador: <strong>{contrato.nombre_trabajador}</strong> ({contrato.tipo_documento} {contrato.numero_documento}) &nbsp;•&nbsp; Cargo: <strong>{contrato.cargo || '—'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn-nuevo-contrato"
            style={{ padding: '7px 13px', fontSize: 13 }}
            onClick={() => imprimirContrato(contrato, tab)}
            title="Abrir vista de impresión y guardar como PDF"
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => descargarComoWord(contrato, tab)}
            title="Descargar documento editable compatible con Microsoft Word"
          >
            <Download size={15} />
            <span>Descargar Word</span>
          </button>

          <button
            type="button"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: copiado ? '#16A34A' : 'var(--text)', fontSize: 13,
              cursor: 'pointer',
            }}
            onClick={handleCopiar}
            title="Copiar texto al portapapeles"
          >
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiado ? 'Copiado' : 'Copiar'}</span>
          </button>

          {onEdit && (
            <button
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 11px', borderRadius: 8, border: '1px solid #BFDBFE',
                background: '#EFF6FF', color: '#1D4ED8', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => { onClose(); onEdit(contrato) }}
              title="Modificar cláusulas, salario o fechas del contrato"
            >
              <Edit size={15} />
              <span>Editar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 6, borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="contrato-tabs-bar">
        <button
          type="button"
          className={`tab-contrato-btn ${tab === 'completo' ? 'active' : ''}`}
          onClick={() => setTab('completo')}
        >
          <Files size={15} />
          <span>Ambos Contratos (Completo para Firma)</span>
        </button>

        <button
          type="button"
          className={`tab-contrato-btn ${tab === 'principal' ? 'active' : ''}`}
          onClick={() => setTab('principal')}
        >
          <FileCheck2 size={15} />
          <span>1. {esAprendiz ? 'Contrato de Aprendizaje' : 'Contrato Laboral'}</span>
        </button>

        <button
          type="button"
          className={`tab-contrato-btn ${tab === 'confidencialidad' ? 'active' : ''}`}
          onClick={() => setTab('confidencialidad')}
        >
          <Lock size={15} />
          <span>2. Contrato de Confidencialidad</span>
        </button>

        {!esAprendiz && (
          <button
            type="button"
            className={`tab-contrato-btn ${tab === 'linea_tiempo' ? 'active' : ''}`}
            onClick={() => setTab('linea_tiempo')}
            style={{ color: tab === 'linea_tiempo' ? '#2563EB' : '#4F46E5' }}
          >
            <span>🔄 Prórrogas & Renovación Automática</span>
          </button>
        )}
      </div>

      {/* Sheet preview container */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#F1F5F9', padding: '24px 16px', borderRadius: 10 }}>
        <div
          className="contrato-preview-sheet"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </AnimatedModal>
  )
}
