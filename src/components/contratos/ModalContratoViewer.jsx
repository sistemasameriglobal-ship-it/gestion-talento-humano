// =============================================================
// src/components/contratos/ModalContratoViewer.jsx
// =============================================================
import { useState, useMemo, useEffect } from 'react'
import AnimatedModal from '../ui/AnimatedModal'
import ModalFirmaRepresentante from './ModalFirmaRepresentante'
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
  CalendarClock,
  User,
  Briefcase,
  CreditCard,
  PenTool,
  Link2,
} from 'lucide-react'

export default function ModalContratoViewer({ contrato, onClose, onEdit, onCompartirFirma, puedeEditar = true }) {
  const [tab, setTab] = useState('completo') // 'completo' | 'principal' | 'confidencialidad' | 'linea_tiempo'
  const [copiado, setCopiado] = useState(false)
  const [firmaVersion, setFirmaVersion] = useState(0)
  const [modalFirmaRepOpen, setModalFirmaRepOpen] = useState(false)

  // Escuchar actualizaciones globales de firma para refrescar la vista al instante
  useEffect(() => {
    const handleFirmaActualizada = () => setFirmaVersion(v => v + 1)
    window.addEventListener('firma-empleador-actualizada', handleFirmaActualizada)
    return () => window.removeEventListener('firma-empleador-actualizada', handleFirmaActualizada)
  }, [])

  if (!contrato) return null

  const esAprendiz = contrato.tipo_contrato === 'aprendizaje' || (contrato.cargo && /aprendiz/i.test(contrato.cargo)) || contrato.tipo_documento === 'TI'
  const esFinDeSemana = /fin.*semana|s[aá]bado.*domingo/i.test(contrato.jornada_laboral || '') || /fin.*semana|s[aá]bado.*domingo/i.test(contrato.horario || '')
  const esFirmado = Boolean(contrato.firmado_por_trabajador || contrato.firma_trabajador)
  const tituloModal = esAprendiz ? 'Contrato de Aprendizaje (Ley 789)' : (esFinDeSemana ? 'Contrato a Término Fijo (Fin de Semana)' : 'Contrato a Término Fijo Inferior a 1 Año')

  // Recalcular documento cuando cambia la pestaña o la firma
  const htmlContent = useMemo(() => {
    return generarHtmlDocumento(contrato, tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrato, tab, firmaVersion])

  const handleCopiar = () => {
    const div = document.createElement('div')
    div.innerHTML = htmlContent
    const texto = div.innerText || div.textContent || ''
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <>
      <AnimatedModal
        open={Boolean(contrato)}
      onRequestClose={onClose}
      maxWidth="1160px"
      backdropStyle={{ alignItems: 'flex-start', paddingTop: '20px', paddingBottom: '24px' }}
      modalStyle={{ width: '96vw', padding: '20px 24px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* 1. CABECERA SUPERIOR LIMPIA CON DATOS Y BOTÓN CERRAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
        gap: 16
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {tituloModal}
            </h3>
            <span className={`contrato-badge-tipo ${esAprendiz ? 'badge-aprendizaje' : 'badge-termino-fijo'}`}>
              {esAprendiz ? '🎓 Aprendiz SENA' : '⏱️ Término Fijo < 1 Año (Prórrogas c/3 meses)'}
            </span>
            {esFinDeSemana && (
              <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                🗓️ Fines de Semana
              </span>
            )}
            {esFirmado ? (
              <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                ✓ Firmado por Colaborador • Firma Rep. Legal Colocada
              </span>
            ) : contrato.firmado_por_empleador ? (
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                ✍️ Firma Rep. Legal Colocada
              </span>
            ) : (
              <span style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }} title="Por confidencialidad, la firma del Representante Legal se coloca automáticamente una vez firme el colaborador">
                🔒 Firma Rep. Legal Protegida (esperando firma del colaborador)
              </span>
            )}
            {contrato.estado === 'pendiente_empleado' && (
              <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                🟡 Candidato por Ingresar
              </span>
            )}
          </div>

          {/* Ficha de datos del colaborador con píldoras elegantes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <User size={13} color="#2563EB" />
              <strong style={{ color: 'var(--text)' }}>{contrato.nombre_trabajador}</strong>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <CreditCard size={13} color="#64748B" />
              <span>{contrato.tipo_documento} {contrato.numero_documento}</span>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <Briefcase size={13} color="#059669" />
              <span>Cargo: <strong style={{ color: 'var(--text)' }}>{contrato.cargo || '—'}</strong></span>
            </span>
          </div>
        </div>

        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.background = '#FEE2E2' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. BARRA DE CONTROL: PESTAÑAS (IZQUIERDA) Y BOTONES DE ACCIÓN (DERECHA) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 0 14px 0',
      }}>
        {/* Pestañas de Navegación del Documento */}
        <div className="contrato-viewer-tabs-group">
          <button
            type="button"
            className={`tab-contrato-pill ${tab === 'completo' ? 'active' : ''}`}
            onClick={() => setTab('completo')}
          >
            <Files size={15} />
            <span>Ambos Contratos (Completo)</span>
          </button>

          <button
            type="button"
            className={`tab-contrato-pill ${tab === 'principal' ? 'active' : ''}`}
            onClick={() => setTab('principal')}
          >
            <FileCheck2 size={15} />
            <span>1. {esAprendiz ? 'Contrato Aprendizaje' : 'Contrato Laboral'}</span>
          </button>

          <button
            type="button"
            className={`tab-contrato-pill ${tab === 'confidencialidad' ? 'active' : ''}`}
            onClick={() => setTab('confidencialidad')}
          >
            <Lock size={15} />
            <span>2. Confidencialidad</span>
          </button>

          {!esAprendiz && (
            <button
              type="button"
              className={`tab-contrato-pill ${tab === 'linea_tiempo' ? 'active' : ''}`}
              onClick={() => setTab('linea_tiempo')}
            >
              <CalendarClock size={15} />
              <span>Cronograma Prórrogas</span>
            </button>
          )}
        </div>

        {/* Botones de Exportación y Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Botón Gestión de Firma del Empleador (solo si tiene permisos de edición) */}
          {puedeEditar && (
            <button
              type="button"
              className="btn-viewer-action"
              onClick={() => setModalFirmaRepOpen(true)}
              title="Subir foto o cambiar la firma digital oficial del Representante Legal"
              style={{
                background: '#F0FDF4',
                borderColor: '#BBF7D0',
                color: '#15803D',
                fontWeight: 700,
              }}
            >
              <PenTool size={14} />
              <span>✍️ Firma Rep. Legal</span>
            </button>
          )}

          {onCompartirFirma && (
            <button
              type="button"
              className="btn-viewer-action"
              onClick={() => onCompartirFirma(contrato)}
              title="Compartir enlace para que el empleado firme ambos contratos digitalmente"
              style={{
                background: '#EFF6FF',
                borderColor: '#BFDBFE',
                color: '#1D4ED8',
                fontWeight: 600,
              }}
            >
              <Link2 size={15} />
              <span>Enlace de Firma</span>
            </button>
          )}

          <button
            type="button"
            className="btn-viewer-action btn-viewer-primary"
            onClick={() => imprimirContrato(contrato, tab)}
            title="Abrir vista oficial de impresión con encabezados repetibles y guardar PDF"
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            className="btn-viewer-action"
            onClick={() => descargarComoWord(contrato, tab)}
            title="Descargar archivo editable compatible con Microsoft Word (.doc)"
          >
            <Download size={15} />
            <span>Descargar Word</span>
          </button>

          <button
            type="button"
            className="btn-viewer-action"
            onClick={handleCopiar}
            title="Copiar texto del documento al portapapeles"
          >
            {copiado ? <Check size={15} color="#16A34A" /> : <Copy size={15} />}
            <span>{copiado ? 'Copiado' : 'Copiar'}</span>
          </button>

          {onEdit && (
            <button
              type="button"
              className="btn-viewer-action btn-viewer-edit"
              onClick={() => { onClose(); onEdit(contrato) }}
              title="Modificar cláusulas, salario o fechas de este contrato"
            >
              <Edit size={15} />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. HOJA DE VISTA PREVIA DEL DOCUMENTO */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#E2E8F0',
        padding: '24px 20px',
        borderRadius: 10,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
      }}>
        <div
          className="contrato-preview-sheet"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </AnimatedModal>

    {/* MODAL CONFIGURAR / SUBIR FOTO FIRMA REPRESENTANTE LEGAL */}
    <ModalFirmaRepresentante
      open={modalFirmaRepOpen}
      onClose={() => setModalFirmaRepOpen(false)}
      onFirmaGuardada={() => setFirmaVersion(v => v + 1)}
    />
  </>
  )
}
